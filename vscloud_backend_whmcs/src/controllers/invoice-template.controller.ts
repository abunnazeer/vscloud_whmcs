// src/controllers/invoice-template.controller.ts
import { Request, Response } from "express";
import { InvoiceTemplateService } from "../services/invoice-template.service";

export class InvoiceTemplateController {
  private templateService: InvoiceTemplateService;

  constructor() {
    this.templateService = new InvoiceTemplateService();
  }

  public createTemplate = async (
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

      const template = await this.templateService.createTemplate(
        userId,
        req.body
      );

      res.status(201).json({
        status: "success",
        data: { template },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create template",
      });
    }
  };

  public getTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { id } = req.params;
      const template = await this.templateService.getTemplate(id, userId);

      res.json({
        status: "success",
        data: { template },
      });
    } catch (error) {
      res.status(404).json({
        status: "error",
        message: error instanceof Error ? error.message : "Template not found",
      });
    }
  };

  public listTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { isActive, search, page, limit } = req.query;

      const result = await this.templateService.listTemplates(userId, {
        isActive: isActive === "true",
        search: search as string,
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
          error instanceof Error ? error.message : "Failed to fetch templates",
      });
    }
  };

  public updateTemplate = async (
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

      const { id } = req.params;
      const template = await this.templateService.updateTemplate(
        id,
        userId,
        req.body
      );

      res.json({
        status: "success",
        data: { template },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to update template",
      });
    }
  };

  public deleteTemplate = async (
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

      const { id } = req.params;
      await this.templateService.deleteTemplate(id, userId);

      res.json({
        status: "success",
        message: "Template deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete template",
      });
    }
  };

  public duplicateTemplate = async (
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

      const { id } = req.params;
      const { name } = req.body;

      const template = await this.templateService.duplicateTemplate(
        id,
        userId,
        name
      );

      res.json({
        status: "success",
        data: { template },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to duplicate template",
      });
    }
  };

  public generateInvoiceFromTemplate = async (
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

      const { templateId } = req.params;
      const invoice = await this.templateService.generateInvoiceFromTemplate(
        templateId,
        userId,
        req.body
      );

      res.json({
        status: "success",
        data: { invoice },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate invoice from template",
      });
    }
  };
}
