// src/controllers/directadmin.controller.ts
import { Request, Response } from "express";
import { DirectAdminService } from "../integrations/directadmin/directadmin.api";
import { HostingService } from "../services/hosting.service";
import { HostingPackageService } from "../services/hosting-package.service";
import { config } from "../config/directadmin";

export class DirectAdminController {
  private directAdmin: DirectAdminService;
  private hostingService: HostingService;
  private packageService: HostingPackageService;

  constructor() {
    this.directAdmin = new DirectAdminService(config);
    this.hostingService = new HostingService();
    this.packageService = new HostingPackageService();
  }

  /**
   * Fetch all users from DirectAdmin
   */
  public fetchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const users = await this.directAdmin.listUsers();

      res.json({
        status: "success",
        data: { users },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch DirectAdmin users",
      });
    }
  };

  /**
   * Sync a specific user account from DirectAdmin to the local database
   */
  public syncUserAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { username } = req.params;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      // Fetch user info from DirectAdmin
      const userInfo = await this.directAdmin.getUserInfo(username);
      
      // Find or create a matching package
      let packageId: string;
      const existingPackage = await this.packageService.findPackageByName(userInfo.package);
      
      if (existingPackage) {
        packageId = existingPackage.id;
      } else {
        // Create a new package based on DirectAdmin limits
        const newPackage = await this.packageService.createPackage({
          name: userInfo.package,
          description: `Imported from DirectAdmin: ${userInfo.package}`,
          diskSpace: userInfo.diskLimit,
          bandwidth: userInfo.bandwidthLimit,
          emailAccounts: 10, // Default values - adjust as needed
          databases: 5,      // Default values - adjust as needed
          subdomains: 10,    // Default values - adjust as needed
          price: 0,          // Set proper pricing later
          billingCycle: "monthly",
        });
        packageId = newPackage.id;
      }

      // Check if hosting account already exists
      const existingAccount = await this.hostingService.findHostingAccountByUsername(username);
      
      let hostingAccount;
      if (existingAccount) {
        // Update existing account
        hostingAccount = await this.hostingService.updateHostingAccountDirectAdmin(existingAccount.id, {
          status: userInfo.status === 'active' ? 'ACTIVE' : 'SUSPENDED',
          serverIp: userInfo.ip,
          diskUsage: userInfo.diskUsed,
          bandwidthUsage: userInfo.bandwidthUsed,
          packageId,
        });
      } else {
        // Create new account
        hostingAccount = await this.hostingService.createHostingAccount({
          userId,
          packageId,
          username: userInfo.username,
          password: 'imported_account', // Cannot get password from DirectAdmin
          serverIp: userInfo.ip,
          domainName: userInfo.domain,
          isImported: true,
          importSource: 'directadmin',
        });
      }

      // Fetch related resources
      const domains = await this.directAdmin.getUserDomains(username);
      const databases = await this.directAdmin.getUserDatabases(username);
      
      // For the primary domain, fetch emails and FTP accounts
      if (userInfo.domain) {
        const emails = await this.directAdmin.getDomainEmails(userInfo.domain);
        const ftpAccounts = await this.directAdmin.getDomainFTPAccounts(userInfo.domain);
        
        // Include these in the response
        hostingAccount.emails = emails;
        hostingAccount.ftpAccounts = ftpAccounts;
      }

      res.json({
        status: "success",
        data: {
          hostingAccount,
          domains,
          databases,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to sync DirectAdmin user",
      });
    }
  };

  /**
   * Suspend a user in DirectAdmin
   */
  public suspendUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { username } = req.params;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      await this.directAdmin.suspendUser(username, reason);
      
      // Update account status in local database if it exists
      const existingAccount = await this.hostingService.findHostingAccountByUsername(username);
      if (existingAccount) {
        await this.hostingService.suspendHostingAccount(existingAccount.id, userId, reason);
      }

      res.json({
        status: "success",
        message: `User ${username} has been suspended`,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to suspend DirectAdmin user",
      });
    }
  };

  /**
   * Unsuspend a user in DirectAdmin
   */
  public unsuspendUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { username } = req.params;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      await this.directAdmin.unsuspendUser(username);
      
      // Update account status in local database if it exists
      const existingAccount = await this.hostingService.findHostingAccountByUsername(username);
      if (existingAccount) {
        await this.hostingService.unsuspendHostingAccount(existingAccount.id, userId);
      }

      res.json({
        status: "success",
        message: `User ${username} has been unsuspended`,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to unsuspend DirectAdmin user",
      });
    }
  };

  /**
   * Delete a user in DirectAdmin
   */
  public deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { username } = req.params;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      await this.directAdmin.deleteUser(username);
      
      // Delete account in local database if it exists
      const existingAccount = await this.hostingService.findHostingAccountByUsername(username);
      if (existingAccount) {
        await this.hostingService.deleteHostingAccount(existingAccount.id, userId);
      }

      res.json({
        status: "success",
        message: `User ${username} has been deleted`,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to delete DirectAdmin user",
      });
    }
  };
}
