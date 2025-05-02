// src/integrations/namecheap/api.ts
import axios from "axios";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

// Function to dynamically get the current IP address
async function getCurrentIP(): Promise<string> {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");
    return response.data.ip;
  } catch (error) {
    console.error("Failed to get current IP:", error);
    // Fall back to the environment variable
    return process.env.NAMECHEAP_CLIENT_IP || "";
  }
}

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

interface NameserverUpdateResponse {
  success: boolean;
  message?: string;
}

interface DomainTransferResponse {
  success: boolean;
  orderId?: string;
  transactionId?: string;
  message?: string;
}

interface DomainRenewResponse {
  success: boolean;
  orderId?: string;
  transactionId?: string;
  expiryDate?: string;
  message?: string;
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

  // Method to update client IP dynamically
  async updateClientIP(): Promise<void> {
    this.clientIp = await getCurrentIP();
    console.log(`Updated client IP to: ${this.clientIp}`);
  }

  private async generateApiParams(
    command: string,
    params: Record<string, any> = {}
  ) {
    // Update client IP before generating parameters
    await this.updateClientIP();

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

      const params = await this.generateApiParams("domains.check", {
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
      const params = await this.generateApiParams("domains.create", {
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
      const apiResponse = this.validateApiResponse(result);
      return {
        success: apiResponse["@_Status"] === "OK",
        orderId: apiResponse.CommandResponse?.DomainCreateResult?.["@_OrderId"],
        transactionId:
          apiResponse.CommandResponse?.DomainCreateResult?.["@_TransactionID"],
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
      const params = await this.generateApiParams("domains.getInfo", {
        DomainName: domainName,
      });
      const response = await axios.get(this.baseUrl, { params });
      const result = this.parser.parse(response.data);
      const apiResponse = this.validateApiResponse(result);
      const domainInfo = apiResponse.CommandResponse.DomainGetInfoResult;
      return {
        status: domainInfo["@_Status"],
        expiryDate: domainInfo.DomainDetails.ExpiredDate,
        nameservers: domainInfo.DnsDetails.Nameservers.split(","),
        whoisGuard: domainInfo.Whoisguard["@_Enabled"] === "True",
      };
    } catch (error) {
      console.error("Failed to get domain info:", error);
      throw new Error("Failed to retrieve domain information");
    }
  }

  async getAllDomains(
    pageSize: number = 100,
    page: number = 1
  ): Promise<{
    domains: Array<{
      name: string;
      createdDate: string;
      expiresDate: string;
      isLocked: boolean;
      autoRenew: boolean;
      whoisGuard: string;
    }>;
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const params = await this.generateApiParams("domains.getList", {
        PageSize: pageSize,
        Page: page,
      });

      console.log(`Fetching domain list from: ${this.baseUrl}`);
      const response = await axios.get(this.baseUrl, {
        params,
        timeout: 15000,
      });

      console.log("Raw API Response:", response.data);
      const parsedResponse = this.parser.parse(response.data);
      console.log(
        "Parsed API Response:",
        JSON.stringify(parsedResponse, null, 2)
      );

      const apiResponse = this.validateApiResponse(parsedResponse);
      const domainsResult = apiResponse.CommandResponse.DomainGetListResult;
      const domains = Array.isArray(domainsResult.Domain)
        ? domainsResult.Domain
        : domainsResult.Domain
        ? [domainsResult.Domain]
        : [];

      // Transform the data into a more usable format
      const domainsList = domains.map((domain: { [x: string]: any }) => ({
        name: domain["@_Name"],
        createdDate: domain["@_Created"],
        expiresDate: domain["@_Expires"],
        isLocked: domain["@_IsLocked"] === "true",
        autoRenew: domain["@_AutoRenew"] === "true",
        whoisGuard: domain["@_WhoisGuard"],
      }));

      return {
        domains: domainsList,
        totalItems: parseInt(domainsResult["@_TotalItems"] || "0"),
        totalPages: parseInt(domainsResult["@_TotalPages"] || "1"),
        currentPage: parseInt(domainsResult["@_CurrentPage"] || "1"),
      };
    } catch (error) {
      console.error("Failed to get domains list:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to retrieve domain list: ${error}`);
    }
  }

  async updateNameservers(
    domainName: string,
    nameservers: string[]
  ): Promise<NameserverUpdateResponse> {
    try {
      const params = await this.generateApiParams("domains.dns.setCustom", {
        DomainName: domainName,
        Nameservers: nameservers.join(","),
      });
      const response = await axios.post(this.baseUrl, null, { params });
      const result = this.parser.parse(response.data);
      const apiResponse = this.validateApiResponse(result);

      return {
        success: apiResponse["@_Status"] === "OK",
        message: "Nameservers updated successfully",
      };
    } catch (error) {
      console.error("Failed to update nameservers:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update nameservers",
      };
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
      // Prepare records in the format required by Namecheap API
      const recordsData = records.map((record, index) => ({
        [`HostName${index + 1}`]: record.hostname,
        [`RecordType${index + 1}`]: record.type,
        [`Address${index + 1}`]: record.address,
        [`TTL${index + 1}`]: record.ttl || 1800,
        ...(record.type === "MX" && {
          [`MXPref${index + 1}`]: record.mxPref || 10,
        }),
      }));

      // Flatten the array of objects into a single object
      const flattenedRecords = recordsData.reduce(
        (acc, curr) => ({ ...acc, ...curr }),
        {}
      );

      const params = await this.generateApiParams("domains.dns.setHosts", {
        DomainName: domainName,
        ...flattenedRecords,
      });

      const response = await axios.post(this.baseUrl, null, { params });
      const result = this.parser.parse(response.data);
      const apiResponse = this.validateApiResponse(result);

      return apiResponse["@_Status"] === "OK";
    } catch (error) {
      console.error("Failed to set DNS records:", error);
      throw new Error("Failed to set DNS records");
    }
  }

  async transferDomain(
    domainName: string,
    authCode: string,
    years: number = 1,
    options: {
      nameservers?: string[] | undefined;
      whoisGuard?: boolean | undefined;
    } = {}
  ): Promise<DomainTransferResponse> {
    try {
      const params = await this.generateApiParams("domains.transfer.create", {
        DomainName: domainName,
        Years: years,
        EPPCode: authCode,
        ...(options.nameservers && {
          Nameservers: options.nameservers.join(","),
        }),
        AddFreeWhoisguard: options.whoisGuard ? "yes" : "no",
        WGEnabled: options.whoisGuard ? "yes" : "no",
      });

      const response = await axios.post(this.baseUrl, null, { params });
      const result = this.parser.parse(response.data);
      const apiResponse = this.validateApiResponse(result);

      if (apiResponse["@_Status"] === "OK") {
        const transferResult =
          apiResponse.CommandResponse.DomainTransferCreateResult;
        return {
          success: true,
          orderId: transferResult["@_OrderId"],
          transactionId: transferResult["@_TransactionID"],
        };
      }

      return {
        success: false,
        message: "Transfer request failed",
      };
    } catch (error) {
      console.error("Domain transfer failed:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to initiate domain transfer",
      };
    }
  }

  async renewDomain(
    domainName: string,
    years: number = 1
  ): Promise<DomainRenewResponse> {
    try {
      const params = await this.generateApiParams("domains.renew", {
        DomainName: domainName,
        Years: years,
      });

      const response = await axios.post(this.baseUrl, null, { params });
      const result = this.parser.parse(response.data);
      const apiResponse = this.validateApiResponse(result);

      if (apiResponse["@_Status"] === "OK") {
        const renewResult = apiResponse.CommandResponse.DomainRenewResult;
        return {
          success: true,
          orderId: renewResult["@_OrderId"],
          transactionId: renewResult["@_TransactionID"],
          expiryDate: renewResult["@_DomainDetails"]?.["@_ExpiredDate"],
        };
      }

      return {
        success: false,
        message: "Domain renewal failed",
      };
    } catch (error) {
      console.error("Domain renewal failed:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to renew domain",
      };
    }
  }

  async getTransferStatus(
    transferId: string
  ): Promise<{ status: string; statusDescription: string }> {
    try {
      const params = await this.generateApiParams(
        "domains.transfer.getStatus",
        {
          TransferID: transferId,
        }
      );

      const response = await axios.get(this.baseUrl, { params });
      const result = this.parser.parse(response.data);
      const apiResponse = this.validateApiResponse(result);

      const transferStatus =
        apiResponse.CommandResponse.TransferGetStatusResult;
      return {
        status: transferStatus["@_Status"],
        statusDescription: transferStatus["@_StatusDescription"],
      };
    } catch (error) {
      console.error("Failed to get transfer status:", error);
      throw new Error("Failed to get domain transfer status");
    }
  }
}
