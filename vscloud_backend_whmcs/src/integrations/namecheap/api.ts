import axios from "axios";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

interface DomainCheckResponse {
  available: boolean;
  price: number;
  currency: string;
  isPremium: boolean;
  icannFee: number;
  premiumPrices?: {
    registration: number;
    renewal: number;
    restore: number;
    transfer: number;
  };
  domain: string;
}

export class NamecheapAPI {
  private apiUser: string;
  private apiKey: string;
  private clientIp: string;
  private userName: string;
  private baseUrl: string;
  private parser: XMLParser;
  private builder: XMLBuilder;

  constructor() {
    this.apiUser = process.env.NAMECHEAP_API_USER || "";
    this.apiKey = process.env.NAMECHEAP_API_KEY || "";
    this.clientIp = process.env.NAMECHEAP_CLIENT_IP || "";
    this.userName = process.env.NAMECHEAP_USERNAME || "";
    this.baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://api.namecheap.com/xml.response"
        : "https://api.sandbox.namecheap.com/xml.response";
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
      trimValues: true,
    });
    this.builder = new XMLBuilder();
  }

  private generateApiParams(command: string, params: Record<string, any> = {}) {
    const apiParams = {
      ApiUser: this.apiUser,
      ApiKey: this.apiKey,
      UserName: this.userName,
      ClientIp: this.clientIp,
      Command: `namecheap.${command}`,
      ...params,
    };

    console.log("Generated API Parameters:", {
      ...apiParams,
      ApiKey: "***",
    });

    return apiParams;
  }

  private validateApiResponse(result: any) {
    console.log("Validating API Response:", JSON.stringify(result, null, 2));

    if (!result) {
      throw new Error("Empty API response received");
    }

    if (!result.ApiResponse) {
      throw new Error(
        `Invalid API response structure: ${JSON.stringify(result)}`
      );
    }

    if (result.ApiResponse["@_Status"] === "ERROR") {
      const errors = result.ApiResponse.Errors?.Error;
      const errorMessage = Array.isArray(errors)
        ? errors.map(e => e["#text"]).join(", ")
        : errors?.["#text"] || "Unknown API Error";
      throw new Error(`Namecheap API Error: ${errorMessage}`);
    }

    return result.ApiResponse;
  }

  async checkDomainAvailability(
    domainName: string
  ): Promise<DomainCheckResponse> {
    try {
      console.log(`Checking availability for domain: ${domainName}`);

      const params = this.generateApiParams("domains.check", {
        DomainList: domainName,
      });

      console.log(`Making API request to: ${this.baseUrl}`);
      const response = await axios.get(this.baseUrl, {
        params,
        timeout: 10000,
      });

      console.log("Raw API Response:", response.data);

      const parsedResponse = this.parser.parse(response.data);
      console.log(
        "Parsed API Response:",
        JSON.stringify(parsedResponse, null, 2)
      );

      const apiResponse = this.validateApiResponse(parsedResponse);
      const domainResult = apiResponse.CommandResponse.DomainCheckResult;

      if (!domainResult) {
        throw new Error(
          `No domain check results found in response: ${JSON.stringify(
            apiResponse.CommandResponse
          )}`
        );
      }

      console.log("Domain Check Result:", domainResult);

      const availability: DomainCheckResponse = {
        available: domainResult["@_Available"] === true,
        domain: domainResult["@_Domain"],
        price: parseFloat(domainResult["@_PremiumRegistrationPrice"] || "0"),
        currency: "USD",
        isPremium: domainResult["@_IsPremiumName"] === true,
        icannFee: parseFloat(domainResult["@_IcannFee"] || "0"),
      };

      // Add premium prices if it's a premium domain
      if (availability.isPremium) {
        availability.premiumPrices = {
          registration: parseFloat(
            domainResult["@_PremiumRegistrationPrice"] || "0"
          ),
          renewal: parseFloat(domainResult["@_PremiumRenewalPrice"] || "0"),
          restore: parseFloat(domainResult["@_PremiumRestorePrice"] || "0"),
          transfer: parseFloat(domainResult["@_PremiumTransferPrice"] || "0"),
        };
      }

      console.log("Final Result:", availability);
      return availability;
    } catch (error) {
      console.error("Domain check failed:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to check domain availability: ${error}`);
    }
  }

  async registerDomain(
    domainName: string,
    years: number = 1,
    options: {
      nameservers?: string[] | undefined;
      whoisGuard?: boolean | undefined;
    } = {}
  ): Promise<{ success: boolean; orderId?: string; transactionId?: string }> {
    try {
      const params = this.generateApiParams("domains.create", {
        DomainName: domainName,
        Years: years,
        ...(options.nameservers && {
          Nameservers: options.nameservers.join(","),
        }),
        AddFreeWhoisguard: options.whoisGuard ? "yes" : "no",
        WGEnabled: options.whoisGuard ? "yes" : "no",
      });
      const response = await axios.post(this.baseUrl, null, { params });
      const result = this.parser.parse(response.data);
      return {
        success: result.ApiResponse.Status === "OK",
        orderId:
          result.ApiResponse.CommandResponse?.DomainCreateResult?.OrderId,
        transactionId:
          result.ApiResponse.CommandResponse?.DomainCreateResult?.TransactionID,
      };
    } catch (error) {
      console.error("Domain registration failed:", error);
      throw new Error("Failed to register domain");
    }
  }

  async getDomainInfo(domainName: string): Promise<{
    status: string;
    expiryDate: string;
    nameservers: string[];
    whoisGuard: boolean;
  }> {
    try {
      const params = this.generateApiParams("domains.getInfo", {
        DomainName: domainName,
      });
      const response = await axios.get(this.baseUrl, { params });
      const result = this.parser.parse(response.data);
      const domainInfo = result.ApiResponse.CommandResponse.DomainGetInfoResult;
      return {
        status: domainInfo.Status,
        expiryDate: domainInfo.DomainDetails.ExpiredDate,
        nameservers: domainInfo.DnsDetails.Nameservers.split(","),
        whoisGuard: domainInfo.Whoisguard.Enabled === "True",
      };
    } catch (error) {
      console.error("Failed to get domain info:", error);
      throw new Error("Failed to retrieve domain information");
    }
  }

  async updateNameservers(
    domainName: string,
    nameservers: string[]
  ): Promise<boolean> {
    try {
      const params = this.generateApiParams("domains.dns.setCustom", {
        DomainName: domainName,
        Nameservers: nameservers.join(","),
      });
      const response = await axios.post(this.baseUrl, null, { params });
      const result = this.parser.parse(response.data);
      return result.ApiResponse.Status === "OK";
    } catch (error) {
      console.error("Failed to update nameservers:", error);
      throw new Error("Failed to update nameservers");
    }
  }

  async setDnsRecords(
    domainName: string,
    records: Array<{
      type: string;
      hostname: string;
      address: string;
      ttl?: number;
      mxPref?: number;
    }>
  ): Promise<boolean> {
    try {
      const params = this.generateApiParams("domains.dns.setHosts", {
        DomainName: domainName,
        Records: records.map(record => ({
          HostName: record.hostname,
          RecordType: record.type,
          Address: record.address,
          TTL: record.ttl || 1800,
          MXPref: record.mxPref || 10,
        })),
      });
      const response = await axios.post(this.baseUrl, null, { params });
      const result = this.parser.parse(response.data);
      return result.ApiResponse.Status === "OK";
    } catch (error) {
      console.error("Failed to set DNS records:", error);
      throw new Error("Failed to set DNS records");
    }
  }
}
