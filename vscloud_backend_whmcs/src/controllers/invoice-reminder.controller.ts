// src/controllers/invoice-reminder.controller.ts
import { Request, Response } from "express";
import { InvoiceReminderService } from "../services/invoice-reminder.service";
import { prisma } from "../config/database";

export class InvoiceReminderController {
  private reminderService: InvoiceReminderService;

  constructor() {
    this.reminderService = new InvoiceReminderService();
  }

  public getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      // Get settings or return defaults
      const settings = (await prisma.reminderSettings.findUnique({
        where: { userId },
      })) || {
        enabled: true,
        beforeDueDays: [1, 3, 7],
        afterDueDays: [1, 3, 7, 14, 30],
        includeAttachment: true,
      };

      res.json({
        status: "success",
        data: { settings },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch reminder settings",
      });
    }
  };

  public updateSettings = async (
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

      const settings = await this.reminderService.updateReminderSettings(
        userId,
        req.body
      );

      res.json({
        status: "success",
        data: { settings },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update reminder settings",
      });
    }
  };

  public sendManualReminder = async (
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

      const { invoiceId } = req.params;
      const { message } = req.body;

      await this.reminderService.sendManualReminder(invoiceId, userId, message);

      res.json({
        status: "success",
        message: "Reminder sent successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to send reminder",
      });
    }
  };

  public getReminderHistory = async (
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

      const { invoiceId } = req.params;

      // Verify the user owns this invoice
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          userId,
        },
      });

      if (!invoice) {
        res.status(404).json({
          status: "error",
          message: "Invoice not found",
        });
        return;
      }

      const history = await this.reminderService.getReminderHistory(invoiceId);

      res.json({
        status: "success",
        data: { history },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch reminder history",
      });
    }
  };
}
