// src/controllers/domain.controller.ts
import { Request, Response } from "express";
import { DomainService } from "../services/domain.service";

// Define the status type locally
type DomainStatus =
  | "ACTIVE"
  | "PENDING"
  | "EXPIRED"
  | "TRANSFERRED"
  | "SUSPENDED";

export class DomainController {
  private domainService: DomainService;

  constructor() {
    this.domainService = new DomainService();
  }

  public createDomain = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const domain = await this.domainService.createDomain({
        ...req.body,
        userId,
        registrationDate: new Date(req.body.registrationDate),
        expiryDate: new Date(req.body.expiryDate),
      });

      res.status(201).json({
        status: "success",
        data: { domain },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create domain",
      });
    }
  };

  public getDomain = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { id } = req.params as { id: string };

      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const domain = await this.domainService.getDomain(id, userId);

      res.json({
        status: "success",
        data: { domain },
      });
    } catch (error) {
      res.status(404).json({
        status: "error",
        message: error instanceof Error ? error.message : "Domain not found",
      });
    }
  };

  public getUserDomains = async (
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

      const { status, search, page, limit, sortBy, sortOrder } = req.query;

      const result = await this.domainService.getUserDomains(userId, {
        status: status as DomainStatus,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: (sortOrder as "asc" | "desc") || "desc",
      });

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch domains",
      });
    }
  };

  public updateDomain = async (req: Request, res: Response): Promise<void> => {
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

      const domain = await this.domainService.updateDomain(
        id,
        userId,
        req.body
      );

      res.json({
        status: "success",
        data: { domain },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to update domain",
      });
    }
  };

  public manageDnsRecords = async (
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

      const records = await this.domainService.manageDnsRecords(
        id,
        userId,
        req.body.records
      );

      res.json({
        status: "success",
        data: { records },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to manage DNS records",
      });
    }
  };

  public deleteDomain = async (req: Request, res: Response): Promise<void> => {
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

      await this.domainService.deleteDomain(id, userId);

      res.json({
        status: "success",
        message: "Domain deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete domain",
      });
    }
  };
}
