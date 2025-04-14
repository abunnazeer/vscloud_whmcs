// src/interfaces/hosting-package.interface.ts

export interface HostingPackage {
  id?: string;
  name: string;
  description?: string;
  price: number;
  setupFee?: number;
  billingCycle: "monthly" | "quarterly" | "biannually" | "annually";
  isActive: boolean;

  // Resource limits
  diskSpace: number; // in MB
  bandwidth: number; // in MB
  emailAccounts: number;
  databases: number;
  ftpAccounts: number;
  subdomains: number;
  addOnDomains: number;

  // Features
  ssl: boolean;
  backup: boolean;
  cloudflare: boolean;

  // Direct Admin package properties
  externalId?: string;
  serverType?: "directadmin" | "cpanel" | "plesk" | "aws" | "other";
  serverId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface PackageUsageStats {
  totalAccounts: number;
  activeAccounts: number;
  avgDiskUsage: number;
  avgBandwidthUsage: number;
  topSellingPeriod?: {
    year: number;
    month: number;
    count: number;
  };
}

export interface PackageFilter {
  isActive?: boolean;
  billingCycle?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
