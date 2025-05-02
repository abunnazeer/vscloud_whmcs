// src/controllers/recurring-invoice.controller.ts
import { Request, Response } from "express";
import { RecurringInvoiceService } from "../services/recurring-invoice.service";
import { Prisma } from "@prisma/client";

// Define the accepted frequency values type
type FrequencyType = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";

export class RecurringInvoiceController {
  private recurringService: RecurringInvoiceService;

  constructor() {
    this.recurringService = new RecurringInvoiceService();
  }

  public createRecurringSchedule = async (
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

      const schedule = await this.recurringService.createRecurringSchedule({
        userId,
        templateId: req.body.templateId,
        frequency: this.mapFrequency(req.body.frequency),
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        recipientId: req.body.recipientId,
        autoSend: req.body.autoSend || false,
        amount: req.body.amount,
        description: req.body.description,
      });

      res.status(201).json({
        status: "success",
        data: { schedule },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create recurring schedule",
      });
    }
  };

  public getRecurringSchedule = async (
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
      const schedule = await this.recurringService.getRecurringSchedule(
        id,
        userId
      );

      res.json({
        status: "success",
        data: { schedule },
      });
    } catch (error) {
      res.status(404).json({
        status: "error",
        message: error instanceof Error ? error.message : "Schedule not found",
      });
    }
  };

  public listRecurringSchedules = async (
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

      const { status, recipientId, page, limit } = req.query;

      const result = await this.recurringService.listRecurringSchedules(
        userId,
        {
          status: status as any,
          recipientId: recipientId as string,
          page: page ? parseInt(page as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
        }
      );

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch schedules",
      });
    }
  };

  public updateRecurringSchedule = async (
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
      const schedule = await this.recurringService.updateRecurringSchedule(
        id,
        userId,
        {
          ...req.body,
          frequency: req.body.frequency
            ? this.mapFrequency(req.body.frequency)
            : undefined,
          endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        }
      );

      res.json({
        status: "success",
        data: { schedule },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to update schedule",
      });
    }
  };

  public deleteRecurringSchedule = async (
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
      await this.recurringService.deleteRecurringSchedule(id, userId);

      res.json({
        status: "success",
        message: "Recurring schedule cancelled successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete schedule",
      });
    }
  };

  public getGenerationLogs = async (
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
      // Get the logs separately
      const logs = await this.recurringService.getGenerationLogs(id, userId);

      res.json({
        status: "success",
        data: { logs },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch logs",
      });
    }
  };

  // Helper method to map frequency strings to enum values
  private mapFrequency(frequency: string): FrequencyType {
    const mappings: Record<string, FrequencyType> = {
      daily: "WEEKLY", // We'll treat daily as weekly for simplicity
      weekly: "WEEKLY",
      monthly: "MONTHLY",
      quarterly: "QUARTERLY",
      yearly: "ANNUALLY",
    };

    // Check if frequency exists in mappings
    if (frequency in mappings) {
      return mappings[frequency as keyof typeof mappings];
    }

    // Default to MONTHLY if not found
    return "MONTHLY";
  }


  
}
