// // src/controllers/hosting-package.controller.ts
// import { Request, Response } from "express";
// import { HostingPackageService } from "../services/hosting-package.service";

// export class HostingPackageController {
//   private packageService: HostingPackageService;

//   constructor() {
//     this.packageService = new HostingPackageService();
//   }

//   public createPackage = async (req: Request, res: Response): Promise<void> => {
//     try {
//       const hostingPackage = await this.packageService.createPackage(req.body);

//       res.status(201).json({
//         status: "success",
//         data: { package: hostingPackage },
//       });
//     } catch (error) {
//       res.status(400).json({
//         status: "error",
//         message:
//           error instanceof Error
//             ? error.message
//             : "Failed to create hosting package",
//       });
//     }
//   };

//   public getPackage = async (req: Request, res: Response): Promise<void> => {
//     try {
//       const { id } = req.params;
//       const hostingPackage = await this.packageService.getPackage(id);

//       res.json({
//         status: "success",
//         data: { package: hostingPackage },
//       });
//     } catch (error) {
//       res.status(404).json({
//         status: "error",
//         message:
//           error instanceof Error ? error.message : "Hosting package not found",
//       });
//     }
//   };

//   public listPackages = async (req: Request, res: Response): Promise<void> => {
//     try {
//       const { isActive, billingCycle, page, limit, sortBy, sortOrder } =
//         req.query;

//       const result = await this.packageService.listPackages({
//         isActive: isActive === "true",
//         billingCycle: billingCycle as string,
//         page: page ? parseInt(page as string) : undefined,
//         limit: limit ? parseInt(limit as string) : undefined,
//         sortBy: sortBy as string,
//         sortOrder: sortOrder as "asc" | "desc",
//       });

//       res.json({
//         status: "success",
//         data: result,
//       });
//     } catch (error) {
//       res.status(400).json({
//         status: "error",
//         message:
//           error instanceof Error
//             ? error.message
//             : "Failed to fetch hosting packages",
//       });
//     }
//   };

//   public updatePackage = async (req: Request, res: Response): Promise<void> => {
//     try {
//       const { id } = req.params;
//       const hostingPackage = await this.packageService.updatePackage(
//         id,
//         req.body
//       );

//       res.json({
//         status: "success",
//         data: { package: hostingPackage },
//       });
//     } catch (error) {
//       res.status(400).json({
//         status: "error",
//         message:
//           error instanceof Error
//             ? error.message
//             : "Failed to update hosting package",
//       });
//     }
//   };

//   public deletePackage = async (req: Request, res: Response): Promise<void> => {
//     try {
//       const { id } = req.params;
//       await this.packageService.deletePackage(id);

//       res.json({
//         status: "success",
//         message: "Hosting package deleted successfully",
//       });
//     } catch (error) {
//       res.status(400).json({
//         status: "error",
//         message:
//           error instanceof Error
//             ? error.message
//             : "Failed to delete hosting package",
//       });
//     }
//   };

//   public comparePackages = async (
//     req: Request,
//     res: Response
//   ): Promise<void> => {
//     try {
//       const { packageIds } = req.body;
//       const comparison = await this.packageService.comparePackages(packageIds);

//       res.json({
//         status: "success",
//         data: { comparison },
//       });
//     } catch (error) {
//       res.status(400).json({
//         status: "error",
//         message:
//           error instanceof Error ? error.message : "Failed to compare packages",
//       });
//     }
//   };

//   public getPackageUsageStats = async (
//     req: Request,
//     res: Response
//   ): Promise<void> => {
//     try {
//       const { id } = req.params;
//       const stats = await this.packageService.getPackageUsageStats(id);

//       res.json({
//         status: "success",
//         data: { stats },
//       });
//     } catch (error) {
//       res.status(400).json({
//         status: "error",
//         message:
//           error instanceof Error
//             ? error.message
//             : "Failed to get package usage stats",
//       });
//     }
//   };
// }

// src/controllers/hosting-package.controller.ts
import { Request, Response } from "express";
import { HostingPackageService } from "../services/hosting-package.service";
import { DirectAdminService } from "../integrations/directadmin/directadmin.service";
import { ServerService } from "../services/server.service";

export class HostingPackageController {
  private packageService: HostingPackageService;
  private serverService: ServerService;

  constructor() {
    this.packageService = new HostingPackageService();
    this.serverService = new ServerService();
  }

  public createPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const hostingPackage = await this.packageService.createPackage(req.body);

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
      const { id } = req.params;
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
      const { isActive, billingCycle, page, limit, sortBy, sortOrder } =
        req.query;

      const result = await this.packageService.listPackages({
        isActive: isActive === "true",
        billingCycle: billingCycle as string,
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
      const { id } = req.params;
      const hostingPackage = await this.packageService.updatePackage(
        id,
        req.body
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
      const { id } = req.params;
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
      const { id } = req.params;
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

  // DirectAdmin specific methods
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
      const { name } = req.params;
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

      const server = await this.serverService.getServer(serverId);
      const daService = new DirectAdminService(server);

      await daService.createPackage(packageData);

      res.status(201).json({
        status: "success",
        message: "DirectAdmin package created successfully",
      });
    } catch (error) {
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
      const { name } = req.params;
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

      await daService.updatePackage(name, packageData);

      res.json({
        status: "success",
        message: "DirectAdmin package updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update DirectAdmin package",
      });
    }
  };

  public deleteDirectAdminPackage = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { name } = req.params;
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

      await daService.deletePackage(name);

      res.json({
        status: "success",
        message: "DirectAdmin package deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete DirectAdmin package",
      });
    }
  };
}
