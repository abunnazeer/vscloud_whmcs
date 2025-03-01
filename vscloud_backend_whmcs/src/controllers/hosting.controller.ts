// src/controllers/hosting.controller.ts
import { Request, Response } from "express";
import { HostingService } from "../services/hosting.service";
import { HostingPackageService } from "../services/hosting-package.service";
import { ServerService } from "../services/server.service";

export class HostingController {
  private hostingService: HostingService;
  private packageService: HostingPackageService;
  private serverService: ServerService;

  constructor() {
    this.hostingService = new HostingService();
    this.packageService = new HostingPackageService();
    this.serverService = new ServerService();
  }

  // Hosting Accounts
  public createHostingAccount = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const account = await this.hostingService.createHostingAccount({
        userId,
        ...req.body,
      });

      res.status(201).json({
        status: "success",
        data: { account },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create hosting account",
      });
    }
  };

  public getHostingAccount = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const account = await this.hostingService.getHostingAccount(id, userId);

      res.json({
        status: "success",
        data: { account },
      });
    } catch (error) {
      res.status(404).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Hosting account not found",
      });
    }
  };

  public listHostingAccounts = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { status, page, limit } = req.query;

      const result = await this.hostingService.listUserHostingAccounts(userId, {
        status: status as any,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
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
            : "Failed to fetch hosting accounts",
      });
    }
  };

  // Databases
  public createDatabase = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { hostingAccountId } = req.params;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const database = await this.hostingService.createDatabase(
        hostingAccountId,
        userId,
        req.body
      );

      res.status(201).json({
        status: "success",
        data: { database },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create database",
      });
    }
  };

  // Email Accounts
  public createEmailAccount = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { hostingAccountId } = req.params;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const emailAccount = await this.hostingService.createEmailAccount(
        hostingAccountId,
        userId,
        req.body
      );

      res.status(201).json({
        status: "success",
        data: { emailAccount },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create email account",
      });
    }
  };

  // FTP Accounts
  public createFTPAccount = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { hostingAccountId } = req.params;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const ftpAccount = await this.hostingService.createFTPAccount(
        hostingAccountId,
        userId,
        req.body
      );

      res.status(201).json({
        status: "success",
        data: { ftpAccount },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create FTP account",
      });
    }
  };

  // Account Management
  public suspendAccount = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const account = await this.hostingService.suspendHostingAccount(
        id,
        userId,
        reason
      );

      res.json({
        status: "success",
        data: { account },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to suspend account",
      });
    }
  };

  public unsuspendAccount = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const account = await this.hostingService.unsuspendHostingAccount(
        id,
        userId
      );

      res.json({
        status: "success",
        data: { account },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to unsuspend account",
      });
    }
  };

  public deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      await this.hostingService.deleteHostingAccount(id, userId);

      res.json({
        status: "success",
        message: "Hosting account deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete account",
      });
    }
  };
}
