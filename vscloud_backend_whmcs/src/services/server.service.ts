import {
  ServerConfig,
  MaintenanceSchedule,
} from "../interfaces/server.interface";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ServerFilter {
  type?: string | undefined;
  status?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class ServerService {
  async createServer(serverData: ServerConfig): Promise<ServerConfig> {
    try {
      const encryptedPassword = await this.encryptPassword(serverData.password);

      const server = await prisma.server.create({
        data: {
          name: serverData.name,
          hostname: serverData.hostname,
          ipAddress: serverData.ipAddress,
          port: serverData.port,
          username: serverData.username,
          password: encryptedPassword,
          useSSL: serverData.useSSL ?? true,
          type: serverData.type,
          status: serverData.status,
          location: serverData.location,
          operatingSystem: serverData.operatingSystem || "Linux",
          totalDiskSpace: serverData.totalDiskSpace || 100000,
          totalBandwidth: serverData.totalBandwidth || 1000000,
          cpuCores: serverData.cpuCores || 4,
          ram: serverData.ram || 8192,
        },
      });

      return {
        ...server,
        password: serverData.password,
      };
    } catch (error: unknown) {
      // Type guard to handle the error properly
      if (error instanceof Error) {
        if (error.name === "DirectAdminError") {
          throw new Error(
            `Cannot connect to DirectAdmin server: DirectAdmin error: ${error.message}`
          );
        }
        throw new Error(`Server creation failed: ${error.message}`);
      }
      // If it's not an Error object, just throw a generic error
      throw new Error("Unknown error occurred during server creation");
    }
  }
  async getServer(id: string): Promise<ServerConfig> {
    const server = await prisma.server.findUnique({
      where: { id },
    });

    if (!server) {
      throw new Error(`Server with ID ${id} not found`);
    }

    // Decrypt password before returning
    const decryptedPassword = await this.decryptPassword(server.password);

    return {
      ...server,
      password: decryptedPassword,
    };
  }

  async listServers(filter: ServerFilter = {}) {
    const { type, status, page = 1, limit = 10 } = filter;

    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [servers, totalCount] = await Promise.all([
      prisma.server.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.server.count({ where }),
    ]);

    // Remove encrypted passwords from response
    const safeServers = servers.map(server => ({
      ...server,
      password: undefined,
    }));

    return {
      servers: safeServers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async updateServer(
    id: string,
    serverData: Partial<ServerConfig>
  ): Promise<ServerConfig> {
    // If password is being updated, encrypt it
    let data: any = { ...serverData };

    if (serverData.password) {
      data.password = await this.encryptPassword(serverData.password);
    }

    const updatedServer = await prisma.server.update({
      where: { id },
      data,
    });

    // Get the complete server with decrypted password
    return this.getServer(id);
  }

  async deleteServer(id: string): Promise<void> {
    await prisma.server.delete({
      where: { id },
    });
  }

  async hasActiveAccounts(serverId: string): Promise<boolean> {
    const count = await prisma.hostingAccount.count({
      where: {
        serverId,
        status: "ACTIVE",
      },
    });

    return count > 0;
  }

  async getServerHistoricalMetrics(id: string, timeRange: string = "24h") {
    // This would typically fetch data from a time-series database or monitoring service
    // For now, returning mock data
    return {
      timestamps: this.generateTimeStamps(timeRange),
      cpuUsage: this.generateRandomMetrics(timeRange),
      memoryUsage: this.generateRandomMetrics(timeRange),
      diskUsage: this.generateRandomMetrics(timeRange),
      bandwidth: this.generateRandomMetrics(timeRange),
    };
  }

  async scheduleMaintenance(
    maintenanceData: Partial<MaintenanceSchedule>
  ): Promise<MaintenanceSchedule> {
    const maintenance = await prisma.maintenanceLog.create({
      data: maintenanceData as any,
    });

    // Update server status if maintenance is starting now
    const now = new Date();
    if (new Date(maintenanceData.startTime!) <= now) {
      await prisma.server.update({
        where: { id: maintenanceData.serverId },
        data: { status: "MAINTENANCE" },
      });
    }

    return maintenance as MaintenanceSchedule;
  }

  async sendMaintenanceNotifications(maintenanceId: string): Promise<void> {
    const maintenance = await prisma.maintenanceLog.findUnique({
      where: { id: maintenanceId },
      include: {
        server: {
          include: {
            hostingAccounts: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!maintenance) {
      throw new Error(`Maintenance with ID ${maintenanceId} not found`);
    }

    // Get all users with accounts on this server
    const users = maintenance.server.hostingAccounts.map(
      account => account.user
    );

    // Send notifications (would typically call an email/notification service)
    // For now, just mark notifications as sent
    await prisma.maintenanceLog.update({
      where: { id: maintenanceId },
      data: { notificationSent: true },
    });
  }

  // Helper methods for encrypting/decrypting passwords
  private async encryptPassword(password: string): Promise<string> {
    // In a real implementation, use a proper encryption library
    // This is just a placeholder
    return `encrypted:${password}`;
  }

  private async decryptPassword(encryptedPassword: string): Promise<string> {
    // In a real implementation, use a proper decryption method
    // This is just a placeholder
    if (encryptedPassword.startsWith("encrypted:")) {
      return encryptedPassword.replace("encrypted:", "");
    }
    return encryptedPassword;
  }

  // Helper methods for generating mock metrics data
  private generateTimeStamps(timeRange: string): Date[] {
    const now = new Date();
    const points = 24; // Number of data points
    const timestamps: Date[] = [];

    let intervalHours = 1;
    if (timeRange === "7d") intervalHours = 7;
    if (timeRange === "30d") intervalHours = 30;

    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now);
      timestamp.setHours(now.getHours() - i * intervalHours);
      timestamps.push(timestamp);
    }

    return timestamps;
  }

  private generateRandomMetrics(_timeRange: string): number[] {
    const points = 24; // Should match timestamps length
    const metrics: number[] = [];

    for (let i = 0; i < points; i++) {
      metrics.push(Math.floor(Math.random() * 100));
    }

    return metrics;
  }
}
