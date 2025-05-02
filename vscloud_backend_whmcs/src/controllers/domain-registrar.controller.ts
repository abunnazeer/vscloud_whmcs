// src/controllers/domain-registrar.controller.ts
import { Request, Response } from "express";
import { DomainRegistrarService } from "../services/domain-registrar.service";
import { RegistrarFactory } from "../services/registrar-factory.service";

const domainRegistrarService = new DomainRegistrarService();

export class DomainRegistrarController {
  static async checkDomainAvailability(req: Request, res: Response) {
    try {
      const { domainName, registrar } = req.body;

      // If registrar is specified, use that one
      if (registrar) {
        const service = RegistrarFactory.createService(registrar);
        const result = await service.checkDomainAvailability(domainName);
        return res.json({
          ...result,
          registrarUsed: registrar,
          availableRegistrars: RegistrarFactory.getRegistrarsForTld(
            RegistrarFactory.extractTld(domainName)
          ),
        });
      }

      // Otherwise check all supported registrars for this TLD
      const tld = RegistrarFactory.extractTld(domainName);
      const supportedRegistrars = RegistrarFactory.getRegistrarsForTld(tld);

      const results = await Promise.all(
        supportedRegistrars.map(async registrarName => {
          try {
            const service = RegistrarFactory.createService(registrarName);
            const result = await service.checkDomainAvailability(domainName);
            return {
              ...result,
              registrar: registrarName,
            };
          } catch (error) {
            return {
              domain: domainName,
              registrar: registrarName,
              available: false,
              error: error instanceof Error ? error.message : "Check failed",
            };
          }
        })
      );

      res.json({
        domain: domainName,
        tld,
        supportedRegistrars,
        results,
      });
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

      // Determine the best registrar for this domain
      const tld = RegistrarFactory.extractTld(domainName);
      const [preferredRegistrar] = RegistrarFactory.getRegistrarsForTld(tld);

      const service = RegistrarFactory.createService(preferredRegistrar);
      const result = await service.registerDomain(userId, domainName, options);

      res.json({
        ...result,
        registrarUsed: preferredRegistrar,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }

  static async getAllDomains(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 100 } = req.query;
      const result = await domainRegistrarService.getAllDomains(
        Number(page),
        Number(pageSize)
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
      // Support both param styles for backward compatibility
      const domainId = req.params.domainId;
      const userId = req.params.userId || req.user?.id; // Assuming auth middleware sets req.user

      if (!userId) {
        return res.status(401).json({
          status: "error",
          message: "User ID is required",
        });
      }

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

  static async updateNameservers(req: Request, res: Response) {
    try {
      // Support both body params and URL params
      const domainId = req.params.domainId || req.body.domainId;
      const userId = req.params.userId || req.body.userId || req.user?.id;
      const { nameservers } = req.body;

      if (!domainId || !userId || !nameservers) {
        return res.status(400).json({
          status: "error",
          message: "Missing required parameters",
        });
      }

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

  static async getDnsRecords(req: Request, res: Response) {
    try {
      const { domainId } = req.params as { domainId: string };
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // This method needs to be implemented in the service
      const result = await domainRegistrarService.getDnsRecords(
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

  static async setDnsRecords(req: Request, res: Response) {
    try {
      const { domainId } = req.params as { domainId: string };
      const userId = req.user?.id;
      const { records } = req.body;

      if (!userId || !records || !Array.isArray(records)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid parameters",
        });
      }

      // This method needs to be implemented in the service
      const result = await domainRegistrarService.setDnsRecords(
        domainId,
        userId,
        records
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

  static async updateDnsRecord(req: Request, res: Response) {
    try {
      const { domainId, recordId } = req.params as {
        domainId: string;
        recordId: string;
      };
      const userId = req.user?.id;
      const recordData = req.body;

      if (!userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // This method needs to be implemented in the service
      const result = await domainRegistrarService.updateDnsRecord(
        domainId,
        recordId,
        userId,
        recordData
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

  static async deleteDnsRecord(req: Request, res: Response) {
    try {
      const { domainId, recordId } = req.params as {
        domainId: string;
        recordId: string;
      };
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // This method needs to be implemented in the service
      const result = await domainRegistrarService.deleteDnsRecord(
        domainId,
        recordId,
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

  static async transferDomain(req: Request, res: Response) {
    try {
      const { userId, domainName, authCode, options } = req.body;

      if (!userId || !domainName || !authCode) {
        return res.status(400).json({
          status: "error",
          message: "Missing required parameters",
        });
      }

      const result = await domainRegistrarService.transferDomain(
        userId,
        domainName,
        authCode,
        options || {}
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

  static async getTransferStatus(req: Request, res: Response) {
    try {
      const { transferId } = req.params;

      if (!transferId) {
        return res.status(400).json({
          status: "error",
          message: "Transfer ID is required",
        });
      }

      // This method needs to be implemented in the service
      const result = await domainRegistrarService.getTransferStatus(transferId);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }

  static async renewDomain(req: Request, res: Response) {
    try {
      const { domainId } = req.params as { domainId: string };
      const userId = req.user?.id;
      const { years = 1 } = req.body;

      if (!userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const result = await domainRegistrarService.renewDomain(
        domainId,
        userId,
        years
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

  static async updatePrivacyProtection(req: Request, res: Response) {
    try {
      const { domainId } = req.params as { domainId: string };
      const userId = req.user?.id;
      const { enabled } = req.body;

      if (!userId || enabled === undefined) {
        return res.status(400).json({
          status: "error",
          message: "Missing required parameters",
        });
      }

      // This method needs to be implemented in the service
      const result = await domainRegistrarService.updatePrivacyProtection(
        domainId,
        userId,
        enabled
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

  static async updateAutoRenew(req: Request, res: Response) {
    try {
      const { domainId } = req.params as { domainId: string };
      const userId = req.user?.id;
      const { enabled } = req.body;

      if (!userId || enabled === undefined) {
        return res.status(400).json({
          status: "error",
          message: "Missing required parameters",
        });
      }

      // This method needs to be implemented in the service
      const result = await domainRegistrarService.updateAutoRenew(
        domainId,
        userId,
        enabled
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

  static async setDomainLock(req: Request, res: Response) {
    try {
      const { domainId } = req.params;
      const userId = req.user?.id;
      const { locked } = req.body;

      if (!userId || locked === undefined) {
        return res.status(400).json({
          status: "error",
          message: "Missing required parameters",
        });
      }

      // This method needs to be implemented in the service
      const result = await domainRegistrarService.setDomainLock(
        domainId,
        userId,
        locked
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
