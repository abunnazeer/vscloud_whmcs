// src/models/schemas/domain.schema.ts
import { z } from "zod";

const nameserverSchema = z.object({
  hostname: z
    .string()
    .regex(
      /^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,
      "Invalid nameserver format"
    ),
  order: z.number().min(1).max(4),
});

export const createDomainSchema = z.object({
  name: z
    .string()
    .regex(
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      "Invalid domain name format"
    ),
  registrar: z.string().optional(),
  registrationDate: z.string().datetime(),
  expiryDate: z.string().datetime(),
  autoRenew: z.boolean().optional(),
  privacyProtection: z.boolean().optional(),
  nameservers: z.array(nameserverSchema).min(2).max(4).optional(),
});

export const updateDomainSchema = z.object({
  autoRenew: z.boolean().optional(),
  privacyProtection: z.boolean().optional(),
  nameservers: z.array(nameserverSchema).min(2).max(4).optional(),
});

const dnsRecordSchema = z.object({
  type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"]),
  name: z.string(),
  content: z.string(),
  ttl: z.number().min(60).max(86400).optional(),
  priority: z.number().min(0).max(65535).optional(),
});

export const manageDnsRecordsSchema = z.object({
  records: z.array(dnsRecordSchema),
});

export const getDomainSchema = z.object({
  id: z.string().cuid(),
});

export const queryDomainsSchema = z.object({
  status: z
    .enum(["ACTIVE", "PENDING", "EXPIRED", "TRANSFERRED", "SUSPENDED"])
    .optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type CreateDomainInput = z.infer<typeof createDomainSchema>;
export type UpdateDomainInput = z.infer<typeof updateDomainSchema>;
export type ManageDnsRecordsInput = z.infer<typeof manageDnsRecordsSchema>;
export type GetDomainInput = z.infer<typeof getDomainSchema>;
export type QueryDomainsInput = z.infer<typeof queryDomainsSchema>;
