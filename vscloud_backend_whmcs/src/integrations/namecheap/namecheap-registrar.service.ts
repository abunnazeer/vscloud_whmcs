// src/namecheap/namecheap-registrar.service.ts
import { NamecheapAPI } from "./api";
import {
  DomainRegistrarInterface,
  DomainCheckResponse,
  DomainRegistrationResponse,
  NameserverResponse,
  DomainInfo,
  TransferStatus,
  DnsRecord,
} from "../../interfaces/domain-registrar.interface";

interface NamecheapConfig {
  apiUser: string;
  apiKey: string;
  username: string;
  isSandbox: boolean;
}

export class NamecheapRegistrarService implements DomainRegistrarInterface {
  private api: NamecheapAPI;

  constructor(config: NamecheapConfig) {
    // Set environment variables that the NamecheapAPI constructor will use
    process.env.NAMECHEAP_API_USER = config.apiUser;
    process.env.NAMECHEAP_API_KEY = config.apiKey;
    process.env.NAMECHEAP_USERNAME = config.username;
    
    // Initialize baseUrl based on sandbox setting
    if (config.isSandbox) {
      process.env.NODE_ENV = 'development';
    } else {
      process.env.NODE_ENV = 'production';
    }
    
    // Initialize the API without arguments - it will use the env vars we just set
    this.api = new NamecheapAPI();
  }

  async checkDomainAvailability(
    domainName: string
  ): Promise<DomainCheckResponse> {
    return this.api.checkDomainAvailability(domainName);
  }

  async registerDomain(
    userId: string,
    domainName: string,
    options: {
      years?: number;
      nameservers?: string[];
      privacyProtection?: boolean;
      autoRenew?: boolean;
      contactDetails?: Record<string, any>;
    }
  ): Promise<DomainRegistrationResponse> {
    return this.api.registerDomain(domainName, options.years || 1, {
      nameservers: options.nameservers,
      whoisGuard: options.privacyProtection,
    });
  }

  async getDomainInfo(domainName: string): Promise<DomainInfo> {
    // Get raw domain info from API
    const rawInfo = await this.api.getDomainInfo(domainName);
    
    // Map whoisGuard to privacyProtection to match interface
    return {
      status: rawInfo.status,
      expiryDate: rawInfo.expiryDate,
      nameservers: rawInfo.nameservers,
      privacyProtection: rawInfo.whoisGuard, // Map whoisGuard to privacyProtection
    };
  }

  async updateNameservers(
    domainName: string,
    nameservers: string[]
  ): Promise<NameserverResponse> {
    return this.api.updateNameservers(domainName, nameservers);
  }

  async transferDomain(
    domainName: string,
    authCode: string,
    years: number = 1,
    options: {
      nameservers?: string[];
      privacyProtection?: boolean;
    } = {}
  ): Promise<DomainRegistrationResponse> {
    return this.api.transferDomain(domainName, authCode, years, {
      nameservers: options.nameservers,
      whoisGuard: options.privacyProtection,
    });
  }

  async getTransferStatus(transferId: string): Promise<TransferStatus> {
    return this.api.getTransferStatus(transferId);
  }

  async renewDomain(
    domainName: string,
    years: number = 1
  ): Promise<DomainRegistrationResponse> {
    return this.api.renewDomain(domainName, years);
  }

  async setDnsRecords(
    domainName: string,
    records: DnsRecord[]
  ): Promise<boolean> {
    return this.api.setDnsRecords(domainName, records);
  }

  async getDnsRecords(domainName: string): Promise<{ records: DnsRecord[] }> {
    throw new Error("Method not implemented.");
  }

  async getAllDomains(page?: number, pageSize?: number): Promise<any> {
    return this.api.getAllDomains(pageSize || 100, page || 1);
  }
}