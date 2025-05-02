// src/upperlink/upperlink-registrar.service.ts
import { UpperlinkAPI } from "./api";
import {
  DomainRegistrarInterface,
  DomainCheckResponse,
  DomainRegistrationResponse,
  NameserverResponse,
  DomainInfo,
  TransferStatus,
  DnsRecord,
} from "../../interfaces/domain-registrar.interface";

interface UpperlinkConfig {
  username: string;
  apiKey: string;
  apiEndpoint: string;
  apiKeyId: string;
  allowedIps: string;
}

export class UpperlinkRegistrarService implements DomainRegistrarInterface {
  private api: UpperlinkAPI;

  constructor(config: UpperlinkConfig) {
    this.api = new UpperlinkAPI(config);
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
      privacyProtection: options.privacyProtection,
      contactDetails: options.contactDetails,
    });
  }

  async getDomainInfo(domainName: string): Promise<DomainInfo> {
    return this.api.getDomainInfo(domainName);
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
      privacyProtection: options.privacyProtection,
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
    throw new Error("Method not implemented.");
  }
}
