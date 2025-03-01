// src/services/domain.service.ts
import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

type DomainStatus =
  | "ACTIVE"
  | "PENDING"
  | "EXPIRED"
  | "TRANSFERRED"
  | "SUSPENDED";

export class DomainService {
  async createDomain(data: {
    name: string;
    userId: string;
    registrar?: string;
    registrationDate: Date;
    expiryDate: Date;
    autoRenew?: boolean;
    privacyProtection?: boolean;
    nameservers?: { hostname: string; order: number }[];
  }) {
    try {
      // Check if domain already exists
      const existingDomain = await prisma.domain.findUnique({
        where: { name: data.name },
      });

      if (existingDomain) {
        throw new Error("Domain already exists");
      }

      // Create domain with nameservers
      const domain = await prisma.domain.create({
        data: {
          name: data.name.toLowerCase(),
          userId: data.userId,
          registrar: data.registrar,
          registrationDate: data.registrationDate,
          expiryDate: data.expiryDate,
          autoRenew: data.autoRenew ?? true,
          privacyProtection: data.privacyProtection ?? true,
          nameservers: {
            create: data.nameservers ?? [],
          },
        },
        include: {
          nameservers: true,
        },
      });

      return domain;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors
        if (error.code === "P2002") {
          throw new Error("Domain already exists");
        }
      }
      throw error;
    }
  }

  async getDomain(id: string, userId: string) {
    const domain = await prisma.domain.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        nameservers: {
          orderBy: {
            order: "asc",
          },
        },
        dnsRecords: true,
      },
    });

    if (!domain) {
      throw new Error("Domain not found");
    }

    return domain;
  }

  async getUserDomains(
    userId: string,
    params: {
      status?: DomainStatus | undefined;
      search?: string | undefined;
      page?: number | undefined;
      limit?: number | undefined;
      sortBy?: string | undefined;
      sortOrder?: "asc" | "desc" | undefined;
    }
  ) {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.DomainWhereInput = {
      userId,
      ...(status && { status }),
      ...(search && {
        name: {
          contains: search.toLowerCase(),
          mode: "insensitive",
        },
      }),
    };

    const [domains, total] = await Promise.all([
      prisma.domain.findMany({
        where,
        include: {
          nameservers: {
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.domain.count({ where }),
    ]);

    return {
      domains,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateDomain(
    id: string,
    userId: string,
    data: {
      autoRenew?: boolean;
      privacyProtection?: boolean;
      nameservers?: { hostname: string; order: number }[];
    }
  ) {
    const domain = await this.getDomain(id, userId);

    // Update nameservers if provided
    if (data.nameservers) {
      await prisma.nameserver.deleteMany({
        where: { domainId: domain.id },
      });

      await prisma.nameserver.createMany({
        data: data.nameservers.map(ns => ({
          domainId: domain.id,
          ...ns,
        })),
      });
    }

    const updatedDomain = await prisma.domain.update({
      where: { id },
      data: {
        autoRenew: data.autoRenew,
        privacyProtection: data.privacyProtection,
        updatedAt: new Date(),
      },
      include: {
        nameservers: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    return updatedDomain;
  }

  async manageDnsRecords(
    domainId: string,
    userId: string,
    records: Array<{
      type: string;
      name: string;
      content: string;
      ttl?: number;
      priority?: number;
    }>
  ) {
    const domain = await this.getDomain(domainId, userId);

    // Create DNS records
    const dnsRecords = await prisma.dnsRecord.createMany({
      data: records.map(record => ({
        domainId: domain.id,
        ...record,
        ttl: record.ttl || 3600,
      })),
    });

    return dnsRecords;
  }

  async deleteDomain(id: string, userId: string) {
    const domain = await this.getDomain(id, userId);

    // Delete related records first
    await prisma.$transaction([
      prisma.dnsRecord.deleteMany({
        where: { domainId: domain.id },
      }),
      prisma.nameserver.deleteMany({
        where: { domainId: domain.id },
      }),
      prisma.domain.delete({
        where: { id: domain.id },
      }),
    ]);

    return true;
  }
}
