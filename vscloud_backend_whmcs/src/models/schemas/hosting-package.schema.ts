// src/models/schemas/hosting-package.schema.ts
import { z } from "zod";

// Schema for server mapping
export const ServerMappingSchema = z.object({
  serverId: z.string(),
  directAdminPackageName: z.string(),
});

export type ServerMapping = z.infer<typeof ServerMappingSchema>;

// Base hosting package schema
const HostingPackageBaseSchema = z.object({
  name: z.string(),
  type: z.enum(["shared", "reseller", "vps", "dedicated"]),
  description: z.string(),
  status: z.enum(["active", "draft", "archived"]),
  pricing: z.object({
    monthly: z.number(),
    quarterly: z.number(),
    annual: z.number(),
  }),
  features: z.object({
    diskSpace: z.string(),
    bandwidth: z.string(),
    domains: z.number(),
    databases: z.number(),
    emailAccounts: z.number(),
    sslCertificate: z.boolean().default(false),
    backups: z.boolean().default(false),
    dedicatedIp: z.boolean().default(false),
  }),
  directAdminPackageName: z.string().optional(),
  serverMappings: z.array(ServerMappingSchema).optional(),
});

// Schema for creating a new hosting package
export const HostingPackageInputSchema = HostingPackageBaseSchema;

// Schema for updating an existing hosting package
export const UpdateHostingPackageInputSchema =
  HostingPackageBaseSchema.partial();

export type HostingPackageInput = z.infer<typeof HostingPackageInputSchema>;
export type UpdateHostingPackageInput = z.infer<
  typeof UpdateHostingPackageInputSchema
>;
