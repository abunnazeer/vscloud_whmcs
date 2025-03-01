// src/controllers/domain-registrar.controller.ts
import { Request, Response } from "express";
import { DomainRegistrarService } from "../services/domain-registrar.service";

const domainRegistrarService = new DomainRegistrarService();

export class DomainRegistrarController {
  static async checkDomainAvailability(req: Request, res: Response) {
    try {
      const { domainName } = req.body;
      const result = await domainRegistrarService.checkDomainAvailability(
        domainName
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }

  static async registerDomain(req: Request, res: Response) {
    try {
      const { userId, domainName, options } = req.body;
      const result = await domainRegistrarService.registerDomain(
        userId,
        domainName,
        options
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }

  static async updateNameservers(req: Request, res: Response) {
    try {
      const { domainId, userId, nameservers } = req.body;
      const result = await domainRegistrarService.updateDomainNameservers(
        domainId,
        userId,
        nameservers
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }

  static async getDomainInfo(req: Request, res: Response) {
    try {
      const { domainId, userId } = req.params;
      const result = await domainRegistrarService.getDomainInfo(
        domainId,
        userId
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }
}
