// src/controllers/reminder.controller.ts
import { Request, Response } from "express";
import { InvoiceReminderService } from "../services/invoice-reminder.service";

export class ReminderController {
  private reminderService: InvoiceReminderService;

  constructor() {
    this.reminderService = new InvoiceReminderService();
  }

  public updateReminderSettings = async (
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

  public scheduleCustomReminder = async (
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
      const { date, message } = req.body;

      const reminder = await this.reminderService.scheduleCustomReminder(
        invoiceId,
        userId,
        new Date(date),
        message
      );

      res.json({
        status: "success",
        data: { reminder },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to schedule reminder",
      });
    }
  };

  public getReminderSettings = async (
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

      const settings = await this.reminderService.getReminderSettings(userId);

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

  public cancelScheduledReminder = async (
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

      const { reminderId } = req.params;
      await this.reminderService.cancelScheduledReminder(reminderId, userId);

      res.json({
        status: "success",
        message: "Reminder cancelled successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to cancel reminder",
      });
    }
  };
}
