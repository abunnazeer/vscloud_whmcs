// src/integrations/upperlink/api.ts
import axios from "axios";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

interface UpperlinkConfig {
  username: string;
  apiKey: string;
  apiEndpoint: string;
}

interface DomainCheckResponse {
  available: boolean;
  price: number;
  currency: string;
  domain: string;
}

interface DomainRegistrationResponse {
  success: boolean;
  orderId?: string;
  message?: string;
}

interface NameserverResponse {
  success: boolean;
  nameservers?: string[];
  message?: string;
}

interface DnsRecord {
  type: string;
  hostname: string;
  address: string;
  ttl?: number;
  mxPref?: number;
}

export class UpperlinkAPI {
  private config: UpperlinkConfig;
  private parser: XMLParser;
  private builder: XMLBuilder;

  constructor(config: UpperlinkConfig) {
    this.config = config;
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
      trimValues: true,
    });
    this.builder = new XMLBuilder();
  }

  private async makeRequest(
    action: string,
    method: "GET" | "POST" = "GET",
    params: Record<string, any> = {}
  ) {
    try {
      const headers = this.getAuthHeaders();
      const url = `${this.config.apiEndpoint}/${action}`;

      console.log(`Making ${method} request to: ${url}`);
      console.log("Request params:", params);

      const response = await axios({
        method,
        url,
        headers,
        data: method === "POST" ? params : undefined,
        params: method === "GET" ? params : undefined,
        timeout: 10000,
      });

      console.log("Raw API Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("API request failed:", error);
      throw new Error(
        `Upperlink API request failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private getAuthHeaders() {
    const time = new Date().toISOString().slice(0, 13); // YYYY-MM-DD HH
    const token = Buffer.from(
      require("crypto")
        .createHmac("sha256", this.config.apiKey)
        .update(`${this.config.username}:${time}`)
        .digest("hex")
    ).toString("base64");

    return {
      username: this.config.username,
      token,
    };
  }

  async checkDomainAvailability(domainName: string): Promise<DomainCheckResponse> {
    try {
      const response = await this.makeRequest("domains/lookup", "POST", {
        searchTerm: domainName,
        isWhmcs: 1,
      });

      const result = this.parser.parse(response);
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Transform the response to match your expected format
      return {
        available: result.available || false,
        price: parseFloat(result.price) || 0,
        currency: result.currency || "USD",
        domain: domainName,
      };
    } catch (error) {
      console.error("Domain availability check failed:", error);
      throw new Error("Failed to check domain availability");
    }
  }

  async registerDomain(
    domainName: string,
    years: number = 1,
    options: {
      nameservers?: string[] | undefined;
      privacyProtection?: boolean | undefined;
      contactDetails?: Record<string, any> | undefined;
    } = {}
  ): Promise<DomainRegistrationResponse> {
    try {
      const postData = {
        domain: domainName,
        regperiod: years,
        nameservers: options.nameservers || [],
        addons: {
          idprotection: options.privacyProtection ? 1 : 0,
        },
        contacts: options.contactDetails || {},
      };

      const response = await this.makeRequest("order/domains/register", "POST", postData);
      const result = this.parser.parse(response);

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        success: true,
        orderId: result.orderId,
      };
    } catch (error) {
      console.error("Domain registration failed:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to register domain",
      };
    }
  }

  async getDomainInfo(domainName: string): Promise<{
    status: string;
    expiryDate: string;
    nameservers: string[];
    privacyProtection: boolean;
  }> {
    try {
      const response = await this.makeRequest(`domains/${domainName}/sync`, "POST");
      const result = this.parser.parse(response);

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        status: result.status || "active",
        expiryDate: result.expires || "",
        nameservers: result.nameservers || [],
        privacyProtection: result.idprotection === 1,
      };
    } catch (error) {
      console.error("Failed to get domain info:", error);
      throw new Error("Failed to retrieve domain information");
    }
  }

  async getNameservers(domainName: string): Promise<NameserverResponse> {
    try {
      const response = await this.makeRequest(`domains/${domainName}/nameservers`, "GET");
      const result = this.parser.parse(response);

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        success: true,
        nameservers: result.nameservers || [],
      };
    } catch (error) {
      console.error("Failed to get nameservers:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get nameservers",
      };
    }
  }

  async updateNameservers(
    domainName: string,
    nameservers: string[]
  ): Promise<NameserverResponse> {
    try {
      const response = await this.makeRequest(`domains/${domainName}/nameservers`, "POST", {
        nameservers,
      });

      const result = this.parser.parse(response);

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        success: true,
        nameservers,
      };
    } catch (error) {
      console.error("Failed to update nameservers:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update nameservers",
      };
    }
  }

  async setDnsRecords(domainName: string, records: DnsRecord[]): Promise<boolean> {
    try {
      const response = await this.makeRequest(`domains/${domainName}/dns`, "POST", {
        dnsrecords: records,
      });

      const result = this.parser.parse(response);

      if (result.error) {
        throw new Error(result.error);
      }

      return true;
    } catch (error) {
      console.error("Failed to set DNS records:", error);
      return false;
    }
  }

  async transferDomain(
    domainName: string,
    authCode: string,
    years: number = 1,
    options: {
      nameservers?: string[] | undefined;
      privacyProtection?: boolean | undefined;
    } = {}
  ): Promise<DomainRegistrationResponse> {
    try {
      const postData = {
        domain: domainName,
        regperiod: years,
        eppcode: authCode,
        nameservers: options.nameservers || [],
        addons: {
          idprotection: options.privacyProtection ? 1 : 0,
        },
      };

      const response = await this.makeRequest("order/domains/transfer", "POST", postData);
      const result = this.parser.parse(response);

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        success: true,
        orderId: result.orderId,
      };
    } catch (error) {
      console.error("Domain transfer failed:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to transfer domain",
      };
    }
  }

  async renewDomain(
    domainName: string,
    years: number = 1
  ): Promise<DomainRegistrationResponse> {
    try {
      const response = await this.makeRequest("order/domains/renew", "POST", {
        domain: domainName,
        regperiod: years,
      });

      const result = this.parser.parse(response);

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        success: true,
        orderId: result.orderId,
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

  async getTransferStatus(transferId: string): Promise<{
    status: string;
    statusDescription: string;
  }> {
    try {
      const response = await this.makeRequest(`domains/${transferId}/transfersync`, "POST");
      const result = this.parser.parse(response);

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        status: result.status || "pending",
        statusDescription: result.message || "Transfer in progress",
      };
    } catch (error) {
      console.error("Failed to get transfer status:", error);
      throw new Error("Failed to get domain transfer status");
    }
  }
}