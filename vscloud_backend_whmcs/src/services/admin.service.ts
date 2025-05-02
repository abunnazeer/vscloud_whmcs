// src/services/admin.service.ts
import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

export class AdminService {
  async getAllDomains(params: {
    search?: string | undefined;
    registrar?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
  }) {
    const {
      search,
      registrar,
      status,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause based on filters
    const where: Prisma.DomainWhereInput = {
      ...(search && {
        name: {
          contains: search.toLowerCase(),
          mode: "insensitive",
        },
      }),
      ...(registrar && { registrar }),
      ...(status && { status }),
    };

    // Execute query with pagination
    const [domains, total] = await Promise.all([
      prisma.domain.findMany({
        where,
        include: {
          nameservers: {
            orderBy: {
              order: "asc",
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
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

  async getDomainDetails(domainId: string) {
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        nameservers: {
          orderBy: {
            order: "asc",
          },
        },
        dnsRecords: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!domain) {
      throw new Error("Domain not found");
    }

    return domain;
  }

  async getRegistrarStats() {
    // Get count of domains by registrar
    const registrarStats = await prisma.domain.groupBy({
      by: ["registrar"],
      _count: {
        id: true,
      },
    });

    // Get expiring domains in the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDomains = await prisma.domain.count({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      },
    });

    return {
      registrarStats: registrarStats.map(stat => ({
        registrar: stat.registrar,
        count: stat._count.id,
      })),
      expiringDomains,
      totalDomains: await prisma.domain.count(),
    };
  }
}
