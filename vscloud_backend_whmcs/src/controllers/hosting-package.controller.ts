// src/controllers/hosting-package.controller.ts
import { Request, Response } from "express";
import { HostingPackageService } from "../services/hosting-package.service";
import { DirectAdminService } from "../integrations/directadmin/directadmin.service";
import { ServerService } from "../services/server.service";
import {
  HostingPackageInput,
  UpdateHostingPackageInput,
} from "../models/schemas/hosting-package.schema";
import { prisma } from "../config/database";

export class HostingPackageController {
  private packageService: HostingPackageService;
  private serverService: ServerService;

  constructor() {
    this.packageService = new HostingPackageService();
    this.serverService = new ServerService();
  }

  public createPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const packageData: HostingPackageInput = req.body;
      const hostingPackage = await this.packageService.createPackage(
        packageData
      );

      res.status(201).json({
        status: "success",
        data: { package: hostingPackage },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create hosting package",
      });
    }
  };

  public getPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as {id:string};
      const hostingPackage = await this.packageService.getPackage(id);

      res.json({
        status: "success",
        data: { package: hostingPackage },
      });
    } catch (error) {
      res.status(404).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Hosting package not found",
      });
    }
  };

  public listPackages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, type, page, limit, sortBy, sortOrder } = req.query;

      const result = await this.packageService.listPackages({
        status: status as "active" | "draft" | "archived" | undefined,
        type: type as "shared" | "reseller" | "vps" | "dedicated" | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      });

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch hosting packages",
      });
    }
  };

  public updatePackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const packageData: UpdateHostingPackageInput = req.body;
      const hostingPackage = await this.packageService.updatePackage(
        id,
        packageData
      );

      res.json({
        status: "success",
        data: { package: hostingPackage },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update hosting package",
      });
    }
  };
  public deletePackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      await this.packageService.deletePackage(id);

      res.json({
        status: "success",
        message: "Hosting package deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete hosting package",
      });
    }
  };

  public comparePackages = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { packageIds } = req.body;
      const comparison = await this.packageService.comparePackages(packageIds);

      res.json({
        status: "success",
        data: { comparison },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to compare packages",
      });
    }
  };
  public getPackageUsageStats = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const stats = await this.packageService.getPackageUsageStats(id);

      res.json({
        status: "success",
        data: { stats },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get package usage stats",
      });
    }
  };

  public listDirectAdminPackages = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { serverId } = req.query;

      if (!serverId) {
        res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
        return;
      }

      const server = await this.serverService.getServer(serverId as string);
      const daService = new DirectAdminService(server);

      const packages = await daService.listPackages();

      res.json({
        status: "success",
        data: { packages },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch DirectAdmin packages",
      });
    }
  };

  public getDirectAdminPackage = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { name } = req.params as { name: string };
      const { serverId } = req.query;

      if (!serverId) {
        res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
        return;
      }

      const server = await this.serverService.getServer(serverId as string);
      const daService = new DirectAdminService(server);

      const packageDetails = await daService.getPackageDetails(name);

      res.json({
        status: "success",
        data: { package: packageDetails },
      });
    } catch (error) {
      res.status(404).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "DirectAdmin package not found",
      });
    }
  };

  public createDirectAdminPackage = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { serverId, ...packageData } = req.body;

      if (!serverId) {
        res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
        return;
      }

      if (!packageData.name) {
        res.status(400).json({
          status: "error",
          message: "Package name is required",
        });
        return;
      }

      const server = await this.serverService.getServer(serverId);
      const daService = new DirectAdminService(server);

      // DirectAdmin requires specific formatting of package parameters
      const finalPackageData = {
        bandwidth: packageData.bandwidth || "unlimited",
        quota: packageData.quota || "unlimited",
        domainptr: packageData.domainptr || "unlimited",
        ftp: packageData.ftp || "unlimited",
        mysql: packageData.mysql || "unlimited",
        nemailf: packageData.nemailf || "unlimited",
        nemailml: packageData.nemailml || "unlimited",
        nemailr: packageData.nemailr || "unlimited",
        nsubdomains: packageData.nsubdomains || "unlimited",
        cgi: packageData.cgi || "ON",
        php: packageData.php || "ON",
        ssl: packageData.ssl || "ON",
        dns: packageData.dns || "ON",
        ...packageData, // Other properties
        name: packageData.name,
        package: packageData.name, // Ensure package field is set
      };

      console.log("Creating DirectAdmin package with data:", finalPackageData);

      const success = await daService.createPackage(finalPackageData);

      if (success) {
        // Try to verify the package details after creation
        try {
          const packageDetails = await daService.getPackageDetails(
            packageData.name
          );

          res.status(201).json({
            status: "success",
            message: "DirectAdmin package created successfully",
            data: {
              package: packageDetails,
            },
          });
        } catch (verifyError) {
          // If we can't verify details but creation reported success
          res.status(201).json({
            status: "success",
            message:
              "DirectAdmin package created but details could not be verified",
            data: {
              package: packageData.name,
            },
          });
        }
      } else {
        res.status(400).json({
          status: "error",
          message: "Failed to create DirectAdmin package",
        });
      }
    } catch (error) {
      console.error("Error in createDirectAdminPackage:", error);
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create DirectAdmin package",
      });
    }
  };

  public updateDirectAdminPackage = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { name } = req.params as { name: string };
      const { serverId, ...packageData } = req.body;

      if (!serverId) {
        res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
        return;
      }

      const server = await this.serverService.getServer(serverId);
      const daService = new DirectAdminService(server);

      // Get original package details to verify changes later
      const originalDetails = await daService.getPackageDetails(name);
      console.log("Original package details:", {
        bandwidth: originalDetails.bandwidth,
        quota: originalDetails.quota,
      });

      // Explicitly convert values to strings and ensure consistent formatting
      const formattedData = { ...packageData };

      // Ensure bandwidth and quota are strings and match DirectAdmin's expected format
      if (formattedData.bandwidth !== undefined) {
        formattedData.bandwidth = String(formattedData.bandwidth);
      }

      if (formattedData.quota !== undefined) {
        formattedData.quota = String(formattedData.quota);
      }

      console.log("Sending update with formatted data:", formattedData);

      const success = await daService.updatePackage(name, formattedData);

      if (success) {
        // Wait a moment to allow DirectAdmin to process the update
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify the changes by getting the updated package details
        const packageDetails = await daService.getPackageDetails(name);

        // Check if values were actually updated
        const bandwidthUpdated = formattedData.bandwidth
          ? packageDetails.bandwidth === formattedData.bandwidth
          : true;
        const quotaUpdated = formattedData.quota
          ? packageDetails.quota === formattedData.quota
          : true;

        console.log("Update verification:", {
          expected: {
            bandwidth: formattedData.bandwidth,
            quota: formattedData.quota,
          },
          actual: {
            bandwidth: packageDetails.bandwidth,
            quota: packageDetails.quota,
          },
          bandwidthUpdated,
          quotaUpdated,
        });

        if (bandwidthUpdated && quotaUpdated) {
          res.json({
            status: "success",
            message: "DirectAdmin package updated successfully",
            data: { package: packageDetails },
          });
        } else {
          // The update was processed but values don't match what we sent
          res.status(200).json({
            status: "warning",
            message:
              "DirectAdmin package update processed but values may not have been applied correctly",
            data: {
              package: packageDetails,
              expected: {
                bandwidth: formattedData.bandwidth,
                quota: formattedData.quota,
              },
            },
          });
        }
      } else {
        res.status(400).json({
          status: "error",
          message: "Failed to update DirectAdmin package",
        });
      }
    } catch (error) {
      console.error("Error updating DirectAdmin package:", error);
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update DirectAdmin package",
      });
    }
  };

  public renameDirectAdminPackage = async (req: Request, res: Response) => {
    try {
      const { oldName } = req.params as { oldName: string };
      const { serverId, newName, ...packageData } = req.body;

      if (!serverId) {
        return res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
      }

      if (!newName) {
        return res.status(400).json({
          status: "error",
          message: "New package name is required",
        });
      }

      const server = await this.serverService.getServer(serverId);
      const daService = new DirectAdminService(server);

      // First verify old package exists
      await daService.getPackageDetails(oldName);

      // Perform the rename
      await daService.renamePackage(oldName, newName, packageData);

      // Verify rename by checking new package exists and old one doesn't
      try {
        const newPackage = await daService.getPackageDetails(newName);

        try {
          await daService.getPackageDetails(oldName);
          return res.status(200).json({
            status: "warning",
            message: "New package created but old package still exists",
            data: newPackage,
          });
        } catch {
          return res.status(200).json({
            status: "success",
            message: "Package renamed successfully",
            data: newPackage,
          });
        }
      } catch (error) {
        return res.status(200).json({
          status: "warning",
          message: "Rename reported success but could not verify new package",
        });
      }
    } catch (error) {
      console.error("Error renaming package:", error);
      return res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Package rename failed",
      });
    }
  };

  public deleteDirectAdminPackage = async (req: Request, res: Response) => {
    try {
      const { name } = req.params as { name: string };
      const { serverId } = req.query;

      // Validate input
      if (!serverId) {
        return res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
      }

      const server = await this.serverService.getServer(serverId as string);
      const daService = new DirectAdminService(server);

      // Verify package exists first
      await daService.getPackageDetails(name);

      // Perform the deletion
      await daService.deletePackage(name);

      return res.json({
        status: "success",
        message: "Package deleted successfully",
      });
    } catch (error) {
      console.error("Delete error:", error);

      let message = "Package delete failed";
      if (error instanceof Error) {
        message = error.message;
        // Handle special cases
        if (message.includes("still exists")) {
          return res.status(200).json({
            status: "warning",
            message: "Delete reported success but package still exists",
          });
        }
      }

      return res.status(400).json({
        status: "error",
        message,
      });
    }
  };

  public getPackageServerMappings = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const mappings = await this.packageService.getServerMappings(id);

      res.json({
        status: "success",
        data: { mappings },
      });
    } catch (error) {
      res.status(404).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Server mappings not found",
      });
    }
  };

  public syncDirectAdminPackage = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { packageId, serverId } = req.body;

      if (!packageId || !serverId) {
        res.status(400).json({
          status: "error",
          message: "Package ID and Server ID are required",
        });
        return;
      }

      const result = await this.packageService.syncDirectAdminPackage(
        packageId,
        serverId
      );

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to sync DirectAdmin package",
      });
    }
  };

  // New method to provision a hosting account with the correct DirectAdmin package
  public provisionHostingAccount = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { packageId, serverId, userId, domainName, username, password } =
        req.body;

      if (!packageId || !serverId || !userId || !username || !password) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields for provisioning",
        });
        return;
      }

      // Get the DirectAdmin package name for this package-server combination
      const directAdminPackageName =
        await this.packageService.getDirectAdminMappingForServer(
          packageId,
          serverId
        );

      if (!directAdminPackageName) {
        res.status(400).json({
          status: "error",
          message: "No DirectAdmin package mapping found for this server",
        });
        return;
      }

      // Get server details
      const server = await this.serverService.getServer(serverId);
      const daService = new DirectAdminService(server);

      // Create user account in DirectAdmin
      const userCreated = await daService.createUser({
        username,
        password,
        email: req.body.email || `${username}@${domainName}`,
        domain: domainName,
        package: directAdminPackageName,
      });

      if (!userCreated) {
        res.status(400).json({
          status: "error",
          message: "Failed to create user in DirectAdmin",
        });
        return;
      }

      // Save hosting account in our database
      // This is simplified - in reality you'd use a HostingAccountService
      const hostingAccount = await prisma.hostingAccount.create({
        data: {
          userId,
          packageId,
          serverId,
          username,
          password: password, // In production, encrypt this
          serverIp: server.ipAddress,
          status: "ACTIVE",
          ...(domainName && {
            domainId: await this.getDomainId(domainName, userId),
          }),
        },
      });

      res.status(201).json({
        status: "success",
        message: "Hosting account provisioned successfully",
        data: {
          hostingAccount,
          directAdminPackage: directAdminPackageName,
        },
      });
    } catch (error) {
      console.error("Provisioning error:", error);
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to provision hosting account",
      });
    }
  };

  // Helper method to get domain ID
  private async getDomainId(
    domainName: string,
    userId: string
  ): Promise<string | null> {
    const domain = await prisma.domain.findFirst({
      where: {
        name: domainName,
        userId,
      },
    });

    return domain?.id || null;
  }
}
