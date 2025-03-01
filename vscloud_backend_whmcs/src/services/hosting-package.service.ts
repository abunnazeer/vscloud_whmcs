// src/services/hosting-package.service.ts
import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export class HostingPackageService {
  async createPackage(data: {
    name: string;
    description?: string;
    diskSpace: number;
    bandwidth: number;
    emailAccounts: number;
    databases: number;
    subdomains: number;
    price: number;
    billingCycle: string;
  }) {
    try {
      return await prisma.hostingPackage.create({
        data: {
          ...data,
          price: new Prisma.Decimal(data.price),
        },
      });
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
      },
    });

    if (!pkg) {
      throw new Error("Hosting package not found");
    }

    return pkg;
  }

  async listPackages(params: {
    isActive?: boolean;
    billingCycle?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const {
      isActive,
      billingCycle,
      page = 1,
      limit = 10,
      sortBy = "price",
      sortOrder = "asc",
    } = params;

    const where = {
      ...(typeof isActive !== "undefined" && { isActive }),
      ...(billingCycle && { billingCycle }),
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

  async updatePackage(
    id: string,
    data: {
      name?: string;
      description?: string;
      diskSpace?: number;
      bandwidth?: number;
      emailAccounts?: number;
      databases?: number;
      subdomains?: number;
      price?: number;
      billingCycle?: string;
      isActive?: boolean;
    }
  ) {
    const pkg = await this.getPackage(id);

    return await prisma.hostingPackage.update({
      where: { id },
      data: {
        ...data,
        ...(data.price && { price: new Prisma.Decimal(data.price) }),
      },
    });
  }

  async deletePackage(id: string) {
    const pkg = await this.getPackage(id);

    // Check if package has active hosting accounts
    if (pkg._count.hostingAccounts > 0) {
      throw new Error("Cannot delete package with active hosting accounts");
    }

    return await prisma.hostingPackage.delete({
      where: { id },
    });
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
          unit: "MB",
        },
        bandwidth: {
          value: pkg.bandwidth,
          unit: "MB",
        },
        emailAccounts: pkg.emailAccounts,
        databases: pkg.databases,
        subdomains: pkg.subdomains,
      },
      pricing: {
        amount: pkg.price,
        billingCycle: pkg.billingCycle,
      },
    }));
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
        avgDiskUsage: acc.avgDiskUsage + account.diskUsage,
        avgBandwidthUsage: acc.avgBandwidthUsage + account.bandwidthUsage,
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
}
