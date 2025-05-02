// src/interfaces/domain-registrar.interface.ts

export interface DomainCheckResponse {
  available: boolean;
  price: number;
  currency: string;
  domain: string;
  isPremium?: boolean;
  icannFee?: number;
  premiumPrices?: {
    registration: number;
    renewal: number;
    restore: number;
    transfer: number;
  };
}

export interface DomainRegistrationResponse {
  success: boolean;
  orderId?: string;
  transactionId?: string;
  message?: string;
}

export interface NameserverResponse {
  success: boolean;
  nameservers?: string[];
  message?: string;
}

export interface DnsRecord {
  type: string;
  hostname: string;
  address: string;
  ttl?: number;
  mxPref?: number;
}

export interface DomainInfo {
  status: string;
  expiryDate: string;
  nameservers: string[];
  privacyProtection: boolean;
  whoisGuard?: boolean;
}

export interface TransferStatus {
  status: string;
  statusDescription: string;
}

export interface DomainRegistrarInterface {
  checkDomainAvailability(domainName: string): Promise<DomainCheckResponse>;
  getAllDomains(page?: number, pageSize?: number): Promise<any>;
  registerDomain(
    userId: string,
    domainName: string,
    options: {
      years?: number;
      nameservers?: string[];
      privacyProtection?: boolean;
      autoRenew?: boolean;
      contactDetails?: Record<string, any>;
    }
  ): Promise<DomainRegistrationResponse>;
  getDomainInfo(domainName: string): Promise<DomainInfo>;
  updateNameservers(
    domainName: string,
    nameservers: string[]
  ): Promise<NameserverResponse>;
  transferDomain(
    domainName: string,
    authCode: string,
    years?: number,
    options?: {
      nameservers?: string[];
      privacyProtection?: boolean;
    }
  ): Promise<DomainRegistrationResponse>;
  getTransferStatus(transferId: string): Promise<TransferStatus>;
  renewDomain(
    domainName: string,
    years?: number
  ): Promise<DomainRegistrationResponse>;
  setDnsRecords(domainName: string, records: DnsRecord[]): Promise<boolean>;
  getDnsRecords(domainName: string): Promise<{ records: DnsRecord[] }>;
}
