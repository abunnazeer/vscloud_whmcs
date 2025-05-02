// src/controllers/admin.controller.ts
import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";

const adminService = new AdminService();

export class AdminController {
  static async getAllDomains(req: Request, res: Response) {
    try {
      const { search, registrar, status, page, limit, sortBy, sortOrder } =
        req.query;

      const result = await adminService.getAllDomains({
        search: search as string | undefined,
        registrar: registrar as string | undefined,
        status: status as string | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as "asc" | "desc" | undefined,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }

  static async getDomainDetails(req: Request, res: Response) {
    try {
      const { domainId } = req.params as { domainId: string };
      const domain = await adminService.getDomainDetails(domainId);
      res.json(domain);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }

  static async getRegistrarStats(req: Request, res: Response) {
    try {
      const stats = await adminService.getRegistrarStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }
}
