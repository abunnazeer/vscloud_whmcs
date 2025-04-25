// src/controllers/server.controller.ts
import { Request, Response } from "express";
import { ServerService } from "../services/server.service";
import { DirectAdminService } from "../integrations/directadmin/directadmin.service";
import {
  ServerConfig,
  MaintenanceSchedule,
} from "../interfaces/server.interface";
import { ServerType } from "@prisma/client";

export class ServerController {
  private serverService: ServerService;

  constructor() {
    this.serverService = new ServerService();
  }

  public createServer = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const serverData: ServerConfig = req.body;

      // Test connection to the server before saving
      if (serverData.type === ServerType.DIRECTADMIN) {
        try {
          const daService = new DirectAdminService(serverData);
          await daService.getServerUsage(); // Test the connection
        } catch (connError) {
          res.status(400).json({
            status: "error",
            message: `Cannot connect to DirectAdmin server: ${
              connError instanceof Error
                ? connError.message
                : "Connection failed"
            }`,
          });
          return;
        }
      }

      const server = await this.serverService.createServer(serverData);

      res.status(201).json({
        status: "success",
        data: {
          server: {
            ...server,
            password: undefined, // Remove password from response
          },
        },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create server",
      });
    }
  };

  public getServer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const server = await this.serverService.getServer(id);

      // Remove sensitive data
      const safeServer = {
        ...server,
        password: undefined,
      };

      res.json({
        status: "success",
        data: { server: safeServer },
      });
    } catch (error) {
      res.status(404).json({
        status: "error",
        message: error instanceof Error ? error.message : "Server not found",
      });
    }
  };

  public listServers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, status, page, limit } = req.query;

      const result = await this.serverService.listServers({
        type: type as string,
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      // Remove sensitive data from all servers
      const safeServers = result.servers.map(server => ({
        ...server,
        password: undefined,
      }));

      res.json({
        status: "success",
        data: {
          servers: safeServers,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch servers",
      });
    }
  };

  public updateServer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const serverData = req.body;

      // Test connection if credentials are being updated
      if (
        serverData.type === ServerType.DIRECTADMIN &&
        (serverData.hostname ||
          serverData.port ||
          serverData.username ||
          serverData.password)
      ) {
        const currentServer = await this.serverService.getServer(id);
        const testConfig = {
          ...currentServer,
          ...serverData,
        };

        try {
          const daService = new DirectAdminService(testConfig);
          await daService.getServerUsage(); // Test the connection
        } catch (connError) {
          res.status(400).json({
            status: "error",
            message: `Cannot connect to DirectAdmin server with updated credentials: ${
              connError instanceof Error
                ? connError.message
                : "Connection failed"
            }`,
          });
          return;
        }
      }

      const server = await this.serverService.updateServer(id, serverData);

      res.json({
        status: "success",
        data: {
          server: {
            ...server,
            password: undefined, // Remove password from response
          },
        },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to update server",
      });
    }
  };

  public updateServerStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const { status } = req.body;

      if (!status || !["active", "maintenance", "offline"].includes(status)) {
        res.status(400).json({
          status: "error",
          message:
            "Invalid server status. Must be 'active', 'maintenance', or 'offline'",
        });
        return;
      }

      const server = await this.serverService.updateServer(id, { status });

      res.json({
        status: "success",
        data: {
          server: {
            ...server,
            password: undefined, // Remove password from response
          },
        },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update server status",
      });
    }
  };

  public deleteServer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };

      // Check if server has any active hosting accounts before deletion
      const hasActiveAccounts = await this.serverService.hasActiveAccounts(id);

      if (hasActiveAccounts) {
        res.status(400).json({
          status: "error",
          message: "Cannot delete server with active hosting accounts",
        });
        return;
      }

      await this.serverService.deleteServer(id);

      res.json({
        status: "success",
        message: "Server deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete server",
      });
    }
  };

  public getServerMetrics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const { timeRange } = req.query;

      const server = await this.serverService.getServer(id);

      let metrics;

      // For DirectAdmin servers, get real-time metrics
      if (server.type === ServerType.DIRECTADMIN) {
        const daService = new DirectAdminService(server);
        const serverUsage = await daService.getServerUsage();

        metrics = {
          realTime: serverUsage,
          historical: await this.serverService.getServerHistoricalMetrics(
            id,
            timeRange as string
          ),
        };
      } else {
        // For other server types, just get historical metrics
        metrics = {
          historical: await this.serverService.getServerHistoricalMetrics(
            id,
            timeRange as string
          ),
        };
      }

      res.json({
        status: "success",
        data: { metrics },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get server metrics",
      });
    }
  };

  public scheduleMaintenance = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { serverId } = req.params;
      const { startTime, endTime, reason, notifyUsers } = req.body;

      if (!startTime || !endTime || !reason) {
        res.status(400).json({
          status: "error",
          message:
            "Start time, end time, and reason are required for maintenance scheduling",
        });
        return;
      }

      const maintenance: Partial<MaintenanceSchedule> = {
        serverId: serverId as string,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        description: reason, // Changed from 'reason' to 'description' to match the interface
        status: "SCHEDULED",
        notificationSent: false,
      };

      // Schedule maintenance
      const scheduledMaintenance = await this.serverService.scheduleMaintenance(
        maintenance
      );

      // Send notifications if requested
      if (notifyUsers && scheduledMaintenance.id) {
        await this.serverService.sendMaintenanceNotifications(
          scheduledMaintenance.id
        );
      }

      res.json({
        status: "success",
        data: { maintenance: scheduledMaintenance },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to schedule maintenance",
      });
    }
  };

  public testConnection = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const serverData: ServerConfig = req.body;

      if (serverData.type === ServerType.DIRECTADMIN) {
        const daService = new DirectAdminService(serverData);
        await daService.getServerUsage();

        res.json({
          status: "success",
          message: "Connection to DirectAdmin server successful",
        });
      } else {
        res.status(400).json({
          status: "error",
          message: `Connection testing not implemented for server type: ${serverData.type}`,
        });
      }
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: `Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  };
}
