// src/controllers/directadmin-user.controller.ts
import { Request, Response } from "express";
import { DirectAdminService } from "../integrations/directadmin/directadmin.service";
import { ServerService } from "../services/server.service";

export class DirectAdminUserController {
  private serverService: ServerService;

  constructor() {
    this.serverService = new ServerService();
  }

  public listUsers = async (req: Request, res: Response): Promise<void> => {
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

      const users = await daService.listUsers();

      res.json({
        status: "success",
        data: { users },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch DirectAdmin users",
      });
    }
  };

  public getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.params as { username: string };
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

      try {
        const userDetails = await daService.getUserDetails(username);

        res.json({
          status: "success",
          data: { user: userDetails },
        });
      } catch (daError) {
        res.status(400).json({
          status: "error",
          message:
            daError instanceof Error
              ? `DirectAdmin error: ${daError.message}`
              : "Error communicating with DirectAdmin",
        });
      }
    } catch (error) {
      res.status(404).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "DirectAdmin user not found",
      });
    }
  };
  public createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { serverId, ...userData } = req.body;

      if (!serverId) {
        res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
        return;
      }

      console.log(userData);
      const server = await this.serverService.getServer(serverId);
      console.log(server);
      const daService = new DirectAdminService(server);
      console.log(daService);
      await daService.createUser(userData);
      console.log(daService);

      res.status(201).json({
        status: "success",
        message: "DirectAdmin user created successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create DirectAdmin user",
      });
    }
  };

  public updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.params as { username: string };
      const { serverId, ...userData } = req.body;

      if (!serverId) {
        res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
        return;
      }

      const server = await this.serverService.getServer(serverId);
      const daService = new DirectAdminService(server);

      try {
        await daService.updateUser(username, userData);

        res.json({
          status: "success",
          message: "DirectAdmin user updated successfully",
        });
      } catch (daError) {
        console.error("DirectAdmin update operation failed:", daError);
        res.status(400).json({
          status: "error",
          message:
            daError instanceof Error
              ? daError.message
              : "Unknown DirectAdmin error",
        });
      }
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update DirectAdmin user",
      });
    }
  };

  public deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.params as { username: string };
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

      await daService.deleteUser(username);

      res.json({
        status: "success",
        message: "DirectAdmin user deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete DirectAdmin user",
      });
    }
  };

  public suspendUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.params as { username: string };
      const { serverId } = req.body;

      if (!serverId) {
        res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
        return;
      }

      const server = await this.serverService.getServer(serverId);
      const daService = new DirectAdminService(server);

      await daService.suspendUser(username);

      res.json({
        status: "success",
        message: "DirectAdmin user suspended successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to suspend DirectAdmin user",
      });
    }
  };

  public unsuspendUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.params as { username: string };
      const { serverId } = req.body;

      if (!serverId) {
        res.status(400).json({
          status: "error",
          message: "Server ID is required",
        });
        return;
      }

      const server = await this.serverService.getServer(serverId);
      const daService = new DirectAdminService(server);

      await daService.unsuspendUser(username);

      res.json({
        status: "success",
        message: "DirectAdmin user unsuspended successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to unsuspend DirectAdmin user",
      });
    }
  };
}
