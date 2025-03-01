// src/services/server.service.ts
import { prisma } from "../config/database";
import {
  ServerStatus,
  ServerType,
  MaintenanceType,
  MaintenanceStatus,
} from "@prisma/client";

export class ServerService {
  async createServer(data: {
    name: string;
    ipAddress: string;
    type: ServerType;
    location: string;
    operatingSystem: string;
    totalDiskSpace: number;
    totalBandwidth: number;
    cpuCores: number;
    ram: number;
  }) {
    return await prisma.server.create({
      data: {
        ...data,
        status: ServerStatus.ACTIVE,
      },
    });
  }

  async getServer(id: string) {
    const server = await prisma.server.findUnique({
      where: { id },
      include: {
        hostingAccounts: {
          include: {
            package: true,
          },
        },
        maintenanceLogs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!server) {
      throw new Error("Server not found");
    }

    return server;
  }

  async listServers(params: {
    type?: ServerType;
    status?: ServerStatus;
    location?: string;
    page?: number;
    limit?: number;
  }) {
    const { type, status, location, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where = {
      ...(type && { type }),
      ...(status && { status }),
      ...(location && { location }),
    };

    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        where,
        include: {
          _count: {
            select: {
              hostingAccounts: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.server.count({ where }),
    ]);

    return {
      servers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateServerStatus(id: string, status: ServerStatus) {
    return await prisma.server.update({
      where: { id },
      data: { status },
    });
  }

  async updateResourceUsage(
    id: string,
    data: {
      usedDiskSpace: number;
      usedBandwidth: number;
    }
  ) {
    return await prisma.server.update({
      where: { id },
      data,
    });
  }

  async scheduleMaintenance(data: {
    serverId: string;
    type: MaintenanceType;
    description: string;
    startTime: Date;
    endTime?: Date;
  }) {
    const server = await this.getServer(data.serverId);

    const maintenance = await prisma.maintenanceLog.create({
      data: {
        ...data,
        status: MaintenanceStatus.SCHEDULED,
      },
    });

    // If maintenance is starting now, update server status
    if (data.startTime <= new Date()) {
      await this.updateServerStatus(server.id, ServerStatus.MAINTENANCE);
    }

    return maintenance;
  }

  async updateMaintenance(
    id: string,
    data: {
      status: MaintenanceStatus;
      endTime?: Date;
    }
  ) {
    const maintenance = await prisma.maintenanceLog.update({
      where: { id },
      data,
      include: {
        server: true,
      },
    });

    // If maintenance is completed, update server status
    if (data.status === MaintenanceStatus.COMPLETED) {
      await this.updateServerStatus(maintenance.server.id, ServerStatus.ACTIVE);
    }

    return maintenance;
  }

  async getServerMetrics(id: string) {
    const server = await this.getServer(id);

    // Calculate resource usage
    const totalAccounts = server.hostingAccounts.length;
    const diskUsagePercentage =
      (server.usedDiskSpace / server.totalDiskSpace) * 100;
    const bandwidthUsagePercentage =
      (server.usedBandwidth / server.totalBandwidth) * 100;

    // Calculate average package requirements
    const avgDiskSpace =
      server.hostingAccounts.reduce(
        (acc, account) => acc + account.package.diskSpace,
        0
      ) / totalAccounts || 0;

    const avgBandwidth =
      server.hostingAccounts.reduce(
        (acc, account) => acc + account.package.bandwidth,
        0
      ) / totalAccounts || 0;

    return {
      totalAccounts,
      diskUsage: {
        used: server.usedDiskSpace,
        total: server.totalDiskSpace,
        percentage: diskUsagePercentage,
      },
      bandwidthUsage: {
        used: server.usedBandwidth,
        total: server.totalBandwidth,
        percentage: bandwidthUsagePercentage,
      },
      averages: {
        diskSpacePerAccount: avgDiskSpace,
        bandwidthPerAccount: avgBandwidth,
      },
      recentMaintenance: server.maintenanceLogs,
    };
  }

  async deleteServer(id: string) {
    const server = await this.getServer(id);

    // Check if server has active hosting accounts
    if (server.hostingAccounts.length > 0) {
      throw new Error("Cannot delete server with active hosting accounts");
    }

    await prisma.$transaction([
      prisma.maintenanceLog.deleteMany({
        where: { serverId: id },
      }),
      prisma.server.delete({
        where: { id },
      }),
    ]);

    return true;
  }
}
