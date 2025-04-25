// src/services/hosting-package.service.ts
import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";
import {
  HostingPackageInput,
  UpdateHostingPackageInput,
} from "../models/schemas/hosting-package.schema";
import { DirectAdminService } from "../integrations/directadmin/directadmin.service";
import { ServerService } from "./server.service";

export class HostingPackageService {
  private serverService: ServerService;

  constructor() {
    this.serverService = new ServerService();
  }

  async createPackage(data: HostingPackageInput) {
    try {
      const packageData = {
        name: data.name,
        type: data.type,
        description: data.description,
        status: data.status,
        monthlyPrice: new Prisma.Decimal(data.pricing.monthly),
        quarterlyPrice: new Prisma.Decimal(data.pricing.quarterly),
        annualPrice: new Prisma.Decimal(data.pricing.annual),
        diskSpace: data.features.diskSpace,
        bandwidth: data.features.bandwidth,
        domains: data.features.domains,
        databases: data.features.databases,
        emailAccounts: data.features.emailAccounts,
        sslCertificate: data.features.sslCertificate,
        backups: data.features.backups,
        dedicatedIp: data.features.dedicatedIp,
        directAdminPackageName: data.directAdminPackageName ?? "",
      };

      // Create the package
      const createdPackage = await prisma.hostingPackage.create({
        data: packageData,
      });

      // Create server mappings if provided
      if (data.serverMappings && data.serverMappings.length > 0) {
        for (const mapping of data.serverMappings) {
          await prisma.packageServerMapping.create({
            data: {
              hostingPackageId: createdPackage.id,
              serverId: mapping.serverId,
              directAdminPackageName: mapping.directAdminPackageName,
            },
          });
        }
      }

      return createdPackage;
    } catch (error) {
      console.error("Failed to create hosting package:", error);
      throw new Error("Failed to create hosting package");
    }
  }

  async getPackage(id: string) {
    const pkg = await prisma.hostingPackage.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            hostingAccounts: true,
          },
        },
        serverMappings: {
          include: {
            server: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!pkg) {
      throw new Error("Hosting package not found");
    }

    return pkg;
  }

  async listPackages(params: {
    status?: "active" | "draft" | "archived" | undefined;
    type?: "shared" | "reseller" | "vps" | "dedicated" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
  }) {
    const {
      status,
      type,
      page = 1,
      limit = 10,
      sortBy = "name",
      sortOrder = "asc",
    } = params;

    const where: Prisma.HostingPackageWhereInput = {
      ...(status && { status }),
      ...(type && { type }),
    };

    const [packages, total] = await Promise.all([
      prisma.hostingPackage.findMany({
        where,
        include: {
          _count: {
            select: {
              hostingAccounts: true,
            },
          },
          serverMappings: {
            include: {
              server: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.hostingPackage.count({ where }),
    ]);

    return {
      packages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updatePackage(id: string, data: UpdateHostingPackageInput) {
    const existingPackage = await this.getPackage(id);

    const updateData: Prisma.HostingPackageUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.type && { type: data.type }),
      ...(data.description && { description: data.description }),
      ...(data.status && { status: data.status }),
      ...(data.pricing?.monthly && {
        monthlyPrice: new Prisma.Decimal(data.pricing.monthly),
      }),
      ...(data.pricing?.quarterly && {
        quarterlyPrice: new Prisma.Decimal(data.pricing.quarterly),
      }),
      ...(data.pricing?.annual && {
        annualPrice: new Prisma.Decimal(data.pricing.annual),
      }),
      ...(data.features?.diskSpace && { diskSpace: data.features.diskSpace }),
      ...(data.features?.bandwidth && { bandwidth: data.features.bandwidth }),
      ...(data.features?.domains && { domains: data.features.domains }),
      ...(data.features?.databases && { databases: data.features.databases }),
      ...(data.features?.emailAccounts && {
        emailAccounts: data.features.emailAccounts,
      }),
      ...(data.features?.sslCertificate !== undefined && {
        sslCertificate: data.features.sslCertificate,
      }),
      ...(data.features?.backups !== undefined && {
        backups: data.features.backups,
      }),
      ...(data.features?.dedicatedIp !== undefined && {
        dedicatedIp: data.features.dedicatedIp,
      }),
      ...(data.directAdminPackageName !== undefined && {
        directAdminPackageName: data.directAdminPackageName,
      }),
    };

    // Update package
    const updatedPackage = await prisma.hostingPackage.update({
      where: { id },
      data: updateData,
      include: {
        serverMappings: true,
      },
    });

    // Update server mappings if provided
    if (data.serverMappings && data.serverMappings.length > 0) {
      // First, clean up any old mappings
      await prisma.packageServerMapping.deleteMany({
        where: { hostingPackageId: id },
      });

      // Then create new mappings
      for (const mapping of data.serverMappings) {
        await prisma.packageServerMapping.create({
          data: {
            hostingPackageId: id,
            serverId: mapping.serverId,
            directAdminPackageName: mapping.directAdminPackageName,
          },
        });
      }
    }

    return await this.getPackage(id);
  }

  async deletePackage(id: string) {
    const pkg = await this.getPackage(id);

    if (pkg._count.hostingAccounts > 0) {
      throw new Error("Cannot delete package with active hosting accounts");
    }

    // Delete server mappings
    await prisma.packageServerMapping.deleteMany({
      where: { hostingPackageId: id },
    });

    // Delete package
    return await prisma.hostingPackage.delete({
      where: { id },
    });
  }

  async getPackageUsageStats(id: string) {
    const pkg = await this.getPackage(id);

    const accounts = await prisma.hostingAccount.findMany({
      where: {
        packageId: id,
      },
      select: {
        diskUsage: true,
        bandwidthUsage: true,
        databases: {
          select: { id: true },
        },
        emailAccounts: {
          select: { id: true },
        },
      },
    });

    const stats = accounts.reduce(
      (acc, account) => ({
        totalAccounts: acc.totalAccounts + 1,
        avgDiskUsage: acc.avgDiskUsage + (account.diskUsage || 0),
        avgBandwidthUsage:
          acc.avgBandwidthUsage + (account.bandwidthUsage || 0),
        totalDatabases: acc.totalDatabases + account.databases.length,
        totalEmailAccounts:
          acc.totalEmailAccounts + account.emailAccounts.length,
      }),
      {
        totalAccounts: 0,
        avgDiskUsage: 0,
        avgBandwidthUsage: 0,
        totalDatabases: 0,
        totalEmailAccounts: 0,
      }
    );

    return {
      package: pkg,
      usage: {
        totalAccounts: stats.totalAccounts,
        averageUsage: {
          diskSpace: stats.totalAccounts
            ? Math.round(stats.avgDiskUsage / stats.totalAccounts)
            : 0,
          bandwidth: stats.totalAccounts
            ? Math.round(stats.avgBandwidthUsage / stats.totalAccounts)
            : 0,
          databasesPerAccount: stats.totalAccounts
            ? Math.round(stats.totalDatabases / stats.totalAccounts)
            : 0,
          emailAccountsPerAccount: stats.totalAccounts
            ? Math.round(stats.totalEmailAccounts / stats.totalAccounts)
            : 0,
        },
      },
    };
  }

  async comparePackages(packageIds: string[]) {
    const packages = await prisma.hostingPackage.findMany({
      where: {
        id: {
          in: packageIds,
        },
      },
    });

    return packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      features: {
        diskSpace: {
          value: pkg.diskSpace,
          unit: "GB", // or extract unit from diskSpace string if it contains it
        },
        bandwidth: {
          value: pkg.bandwidth,
          unit: "GB", // or extract unit from bandwidth string if it contains it
        },
        domains: pkg.domains,
        // Only include subdomains if it exists in your model
        // ...(pkg.subdomains !== undefined && { subdomains: pkg.subdomains }),
        emailAccounts: pkg.emailAccounts,
        databases: pkg.databases,
      },
      pricing: {
        monthly: pkg.monthlyPrice,
        quarterly: pkg.quarterlyPrice,
        annual: pkg.annualPrice,
      },
    }));
  }

  async getServerMappings(packageId: string) {
    return await prisma.packageServerMapping.findMany({
      where: { hostingPackageId: packageId },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  async getDirectAdminMappingForServer(packageId: string, serverId: string) {
    const mapping = await prisma.packageServerMapping.findUnique({
      where: {
        hostingPackageId_serverId: {
          hostingPackageId: packageId,
          serverId: serverId,
        },
      },
    });

    if (!mapping) {
      // Fall back to the default DirectAdmin package name from the hosting package
      const hostingPackage = await prisma.hostingPackage.findUnique({
        where: { id: packageId },
        select: { directAdminPackageName: true },
      });

      return hostingPackage?.directAdminPackageName;
    }

    return mapping.directAdminPackageName;
  }

  async syncDirectAdminPackage(packageId: string, serverId: string) {
    // Get package and server details
    const pkg = await this.getPackage(packageId);
    const server = await this.serverService.getServer(serverId);

    if (server.type !== "DIRECTADMIN") {
      throw new Error("Server is not a DirectAdmin server");
    }

    // Get the DirectAdmin package name for this server
    const directAdminPackageName = await this.getDirectAdminMappingForServer(
      packageId,
      serverId
    );

    if (!directAdminPackageName) {
      throw new Error("No DirectAdmin package mapping found for this server");
    }

    // Initialize DirectAdmin service
    const daService = new DirectAdminService(server);

    // Try to get existing package
    let daPackageExists = false;
    try {
      await daService.getPackageDetails(directAdminPackageName);
      daPackageExists = true;
    } catch (error) {
      // Package doesn't exist, we'll create it
    }

    // Convert our package specs to DirectAdmin format
    const daPackageData = {
      name: directAdminPackageName,
      package: directAdminPackageName,
      bandwidth: pkg.bandwidth,
      quota: pkg.diskSpace,
      domainptr: pkg.domains.toString(),
      ftp: "unlimited", // Define based on your needs
      mysql: pkg.databases.toString(),
      nemailf: pkg.emailAccounts.toString(),
      nemailml: "unlimited", // Define based on your needs
      nemailr: "unlimited", // Define based on your needs
      nsubdomains: "unlimited", // Define based on your needs
      cgi: "ON",
      php: "ON",
      ssl: pkg.sslCertificate ? "ON" : "OFF",
      dns: "ON",
    };

    if (daPackageExists) {
      // Update existing package
      await daService.updatePackage(directAdminPackageName, daPackageData);
      return { status: "updated", packageName: directAdminPackageName };
    } else {
      // Create new package
      await daService.createPackage(daPackageData);
      return { status: "created", packageName: directAdminPackageName };
    }
  }
}
