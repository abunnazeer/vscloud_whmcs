// src/services/hosting.service.ts
import { prisma } from "../config/database";
import bcrypt from "bcryptjs";
import {
  HostingStatus,
  ServerStatus,
  DatabaseType,
  Prisma,
} from "@prisma/client";

export class HostingService {
  async createHostingAccount(data: {
    userId: string;
    packageId: string;
    domainId?: string;
    username: string;
    password: string;
  }) {
    try {
      // Find available server
      const server = await prisma.server.findFirst({
        where: {
          status: ServerStatus.ACTIVE,
          type: "SHARED", // For now, defaulting to shared hosting
        },
      });

      if (!server) {
        throw new Error("No available servers found");
      }

      // Create hosting account
      const hostingAccount = await prisma.hostingAccount.create({
        data: {
          userId: data.userId,
          packageId: data.packageId,
          domainId: data.domainId,
          username: data.username,
          password: await bcrypt.hash(data.password, 12), // Hash password for security
          serverIp: server.ipAddress,
          serverId: server.id,
          status: HostingStatus.PENDING,
        },
        include: {
          package: true,
          domain: true,
          server: true,
        },
      });

      // Here you would typically call your server provisioning system
      // await this.provisionHostingAccount(hostingAccount);

      return hostingAccount;
    } catch (error) {
      console.error("Failed to create hosting account:", error);
      throw error;
    }
  }

  async getHostingAccount(id: string, userId: string) {
    const account = await prisma.hostingAccount.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        package: true,
        domain: true,
        server: true,
        ftpAccounts: true,
        databases: true,
        emailAccounts: true,
      },
    });

    if (!account) {
      throw new Error("Hosting account not found");
    }

    return account;
  }

  async listUserHostingAccounts(
    userId: string,
    params: {
      status?: HostingStatus;
      page?: number | undefined;
      limit?: number | undefined;
    }
  ) {
    const { status, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.HostingAccountWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [accounts, total] = await Promise.all([
      prisma.hostingAccount.findMany({
        where,
        include: {
          package: true,
          domain: true,
          server: {
            select: {
              id: true,
              name: true,
              ipAddress: true,
              status: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.hostingAccount.count({ where }),
    ]);

    return {
      accounts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createDatabase(
    hostingAccountId: string,
    userId: string,
    data: {
      name: string;
      type: DatabaseType;
    }
  ) {
    const account = await this.getHostingAccount(hostingAccountId, userId);

    // Check if user has reached database limit
    const currentDatabases = await prisma.database.count({
      where: { hostingAccountId },
    });

    if (currentDatabases >= account.package.databases) {
      throw new Error("Database limit reached for this hosting package");
    }

    // Generate random username and password
    const username = `user_${Math.random().toString(36).substring(2, 10)}`;
    const password = Math.random().toString(36).substring(2, 15);

    const database = await prisma.database.create({
      data: {
        hostingAccountId,
        name: data.name,
        type: data.type,
        username,
        password: await bcrypt.hash(password, 12),
      },
    });

    // Return unhashed password only once
    return {
      ...database,
      password,
    };
  }

  async createEmailAccount(
    hostingAccountId: string,
    userId: string,
    data: {
      email: string;
      password: string;
      forwardTo?: string;
      quotaSize?: number;
    }
  ) {
    const account = await this.getHostingAccount(hostingAccountId, userId);

    // Check if user has reached email account limit
    const currentEmails = await prisma.emailAccount.count({
      where: { hostingAccountId },
    });

    if (currentEmails >= account.package.emailAccounts) {
      throw new Error("Email account limit reached for this hosting package");
    }

    return await prisma.emailAccount.create({
      data: {
        hostingAccountId,
        email: data.email,
        password: await bcrypt.hash(data.password, 12),
        forwardTo: data.forwardTo,
        quotaSize: data.quotaSize || 1024, // Default 1GB
      },
    });
  }

  async createFTPAccount(
    hostingAccountId: string,
    userId: string,
    data: {
      username: string;
      password: string;
      directory?: string;
      permissions?: string;
    }
  ) {
    await this.getHostingAccount(hostingAccountId, userId);

    return await prisma.fTPAccount.create({
      data: {
        hostingAccountId,
        username: data.username,
        password: await bcrypt.hash(data.password, 12),
        directory: data.directory || "/",
        permissions: data.permissions || "read_write",
      },
    });
  }

  async suspendHostingAccount(id: string, userId: string, reason: string) {
    const account = await this.getHostingAccount(id, userId);

    return await prisma.hostingAccount.update({
      where: { id },
      data: {
        status: HostingStatus.SUSPENDED,
        suspensionReason: reason,
      },
    });
  }

  async unsuspendHostingAccount(id: string, userId: string) {
    const account = await this.getHostingAccount(id, userId);

    return await prisma.hostingAccount.update({
      where: { id },
      data: {
        status: HostingStatus.ACTIVE,
        suspensionReason: null,
      },
    });
  }

  async updateResourceUsage(
    id: string,
    data: {
      diskUsage: number;
      bandwidthUsage: number;
    }
  ) {
    return await prisma.hostingAccount.update({
      where: { id },
      data: {
        diskUsage: data.diskUsage,
        bandwidthUsage: data.bandwidthUsage,
      },
    });
  }

  async deleteHostingAccount(id: string, userId: string) {
    const account = await this.getHostingAccount(id, userId);

    // First delete related records
    await prisma.$transaction([
      prisma.fTPAccount.deleteMany({
        where: { hostingAccountId: id },
      }),
      prisma.database.deleteMany({
        where: { hostingAccountId: id },
      }),
      prisma.emailAccount.deleteMany({
        where: { hostingAccountId: id },
      }),
      prisma.hostingAccount.delete({
        where: { id },
      }),
    ]);

    return true;
  }
}
