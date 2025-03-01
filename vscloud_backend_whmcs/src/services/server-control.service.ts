// src/services/server-control.service.ts
import { WHMApi } from "../integrations/whm/whm.api";
import { CPanelApi } from "../integrations/cpanel/cpanel.api";
import { prisma } from "../config/database";

export class ServerControlService {
  private whmApi: WHMApi;

  constructor() {
    this.whmApi = new WHMApi();
  }

  private getCPanelApi(serverIp: string, username: string, password: string) {
    return new CPanelApi(serverIp, username, password);
  }

  async provisionHostingAccount(hostingAccountId: string) {
    try {
      const hostingAccount = await prisma.hostingAccount.findUnique({
        where: { id: hostingAccountId },
        include: {
          package: true,
          domain: true,
          user: true,
        },
      });

      if (!hostingAccount) {
        throw new Error("Hosting account not found");
      }

      // Create the account in WHM
      const accountData = {
        username: hostingAccount.username,
        domain: hostingAccount.domain?.name || "",
        plan: hostingAccount.package.name,
        password: hostingAccount.password,
        email: hostingAccount.user.email,
      };

      await this.whmApi.createAccount(accountData);

      // Update account status
      await prisma.hostingAccount.update({
        where: { id: hostingAccountId },
        data: { status: "ACTIVE" },
      });

      return true;
    } catch (error) {
      console.error("Failed to provision hosting account:", error);

      // Update account status to failed
      await prisma.hostingAccount.update({
        where: { id: hostingAccountId },
        data: { status: "FAILED" },
      });

      throw error;
    }
  }

  async suspendHostingAccount(hostingAccountId: string, reason: string) {
    const hostingAccount = await prisma.hostingAccount.findUnique({
      where: { id: hostingAccountId },
    });

    if (!hostingAccount) {
      throw new Error("Hosting account not found");
    }

    await this.whmApi.suspendAccount(hostingAccount.username, reason);

    return await prisma.hostingAccount.update({
      where: { id: hostingAccountId },
      data: {
        status: "SUSPENDED",
        suspensionReason: reason,
      },
    });
  }

  async unsuspendHostingAccount(hostingAccountId: string) {
    const hostingAccount = await prisma.hostingAccount.findUnique({
      where: { id: hostingAccountId },
    });

    if (!hostingAccount) {
      throw new Error("Hosting account not found");
    }

    await this.whmApi.unsuspendAccount(hostingAccount.username);

    return await prisma.hostingAccount.update({
      where: { id: hostingAccountId },
      data: {
        status: "ACTIVE",
        suspensionReason: null,
      },
    });
  }

  async terminateHostingAccount(hostingAccountId: string) {
    const hostingAccount = await prisma.hostingAccount.findUnique({
      where: { id: hostingAccountId },
    });

    if (!hostingAccount) {
      throw new Error("Hosting account not found");
    }

    await this.whmApi.terminateAccount(hostingAccount.username);

    return await prisma.hostingAccount.update({
      where: { id: hostingAccountId },
      data: {
        status: "TERMINATED",
      },
    });
  }

  async createDatabase(hostingAccountId: string, name: string) {
    const hostingAccount = await prisma.hostingAccount.findUnique({
      where: { id: hostingAccountId },
    });

    if (!hostingAccount) {
      throw new Error("Hosting account not found");
    }

    const cpanel = this.getCPanelApi(
      hostingAccount.serverIp,
      hostingAccount.username,
      hostingAccount.password
    );

    // Create database in cPanel
    await cpanel.createDatabase(name);

    // Generate random password for database user
    const password = Math.random().toString(36).slice(-8);
    const dbUser = `${hostingAccount.username}_${name}`;

    // Create database user
    await cpanel.createDatabaseUser(dbUser, password);

    // Create database record in our system
    return await prisma.database.create({
      data: {
        hostingAccountId,
        name,
        username: dbUser,
        password,
        type: "MYSQL",
      },
    });
  }

  async createEmailAccount(
    hostingAccountId: string,
    data: {
      email: string;
      password: string;
      quotaSize: number;
      forwardTo?: string;
    }
  ) {
    const hostingAccount = await prisma.hostingAccount.findUnique({
      where: { id: hostingAccountId },
    });

    if (!hostingAccount) {
      throw new Error("Hosting account not found");
    }

    const cpanel = this.getCPanelApi(
      hostingAccount.serverIp,
      hostingAccount.username,
      hostingAccount.password
    );

    // Create email account in cPanel
    await cpanel.createEmailAccount(data.email, data.password, data.quotaSize);

    // Set up email forwarding if requested
    if (data.forwardTo) {
      await cpanel.createEmailForwarder(data.email, data.forwardTo);
    }

    // Create email account record in our system
    return await prisma.emailAccount.create({
      data: {
        hostingAccountId,
        email: data.email,
        password: data.password,
        quotaSize: data.quotaSize,
        forwardTo: data.forwardTo,
      },
    });
  }

  async createFTPAccount(
    hostingAccountId: string,
    data: {
      username: string;
      password: string;
      directory: string;
    }
  ) {
    const hostingAccount = await prisma.hostingAccount.findUnique({
      where: { id: hostingAccountId },
    });

    if (!hostingAccount) {
      throw new Error("Hosting account not found");
    }

    const cpanel = this.getCPanelApi(
      hostingAccount.serverIp,
      hostingAccount.username,
      hostingAccount.password
    );

    // Create FTP account in cPanel
    await cpanel.createFTPAccount(data.username, data.password, data.directory);

    // Create FTP account record in our system
    return await prisma.ftpAccount.create({
      data: {
        hostingAccountId,
        username: data.username,
        password: data.password,
        directory: data.directory,
      },
    });
  }

  async getResourceUsage(hostingAccountId: string) {
    const hostingAccount = await prisma.hostingAccount.findUnique({
      where: { id: hostingAccountId },
    });

    if (!hostingAccount) {
      throw new Error("Hosting account not found");
    }

    const cpanel = this.getCPanelApi(
      hostingAccount.serverIp,
      hostingAccount.username,
      hostingAccount.password
    );

    const [bandwidthUsage, diskUsage] = await Promise.all([
      cpanel.getBandwidthUsage(),
      cpanel.getDiskUsage(),
    ]);

    // Update usage in our system
    await prisma.hostingAccount.update({
      where: { id: hostingAccountId },
      data: {
        bandwidthUsage: Math.floor(bandwidthUsage.bytes_used / (1024 * 1024)), // Convert to MB
        diskUsage: Math.floor(diskUsage.bytes_used / (1024 * 1024)), // Convert to MB
      },
    });

    return {
      bandwidth: bandwidthUsage,
      disk: diskUsage,
    };
  }

  async installSSL(
    hostingAccountId: string,
    data: {
      certificate: string;
      key: string;
      domain: string;
    }
  ) {
    const hostingAccount = await prisma.hostingAccount.findUnique({
      where: { id: hostingAccountId },
    });

    if (!hostingAccount) {
      throw new Error("Hosting account not found");
    }

    const cpanel = this.getCPanelApi(
      hostingAccount.serverIp,
      hostingAccount.username,
      hostingAccount.password
    );

    return await cpanel.installSSL(data.certificate, data.key, data.domain);
  }
}
