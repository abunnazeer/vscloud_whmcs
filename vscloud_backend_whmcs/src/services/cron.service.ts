// src/services/cron.service.ts
import cron from "node-cron";
import { RecurringInvoiceService } from "./recurring-invoice.service";
import { InvoiceReminderService } from "./invoice-reminder.service";
import { InvoiceAnalyticsService } from "./invoice-analytics.service";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";

export class CronService {
  private recurringInvoiceService: RecurringInvoiceService;
  private reminderService: InvoiceReminderService;
  private analyticsService: InvoiceAnalyticsService;

  constructor() {
    this.recurringInvoiceService = new RecurringInvoiceService();
    this.reminderService = new InvoiceReminderService();
    this.analyticsService = new InvoiceAnalyticsService();
  }

  initializeCronJobs() {
    // Process recurring invoices daily at 1 AM
    cron.schedule("0 1 * * *", async () => {
      try {
        logger.info("Starting recurring invoice processing");
        await this.processRecurringInvoices();
        logger.info("Completed recurring invoice processing");
      } catch (error) {
        logger.error("Error processing recurring invoices:", error);
      }
    });

    // Send invoice reminders daily at 9 AM
    cron.schedule("0 9 * * *", async () => {
      try {
        logger.info("Starting invoice reminder processing");
        await this.processInvoiceReminders();
        logger.info("Completed invoice reminder processing");
      } catch (error) {
        logger.error("Error processing invoice reminders:", error);
      }
    });

    // Update invoice statuses hourly
    cron.schedule("0 * * * *", async () => {
      try {
        logger.info("Starting invoice status updates");
        await this.updateInvoiceStatuses();
        logger.info("Completed invoice status updates");
      } catch (error) {
        logger.error("Error updating invoice statuses:", error);
      }
    });

    // Generate monthly analytics reports on the 1st of each month
    cron.schedule("0 2 1 * *", async () => {
      try {
        logger.info("Starting monthly analytics generation");
        await this.generateMonthlyAnalytics();
        logger.info("Completed monthly analytics generation");
      } catch (error) {
        logger.error("Error generating monthly analytics:", error);
      }
    });

    // Cleanup old temporary files daily at 3 AM
    cron.schedule("0 3 * * *", async () => {
      try {
        logger.info("Starting temporary file cleanup");
        await this.cleanupTemporaryFiles();
        logger.info("Completed temporary file cleanup");
      } catch (error) {
        logger.error("Error cleaning up temporary files:", error);
      }
    });
  }

  private async processRecurringInvoices() {
    await this.recurringInvoiceService.processRecurringInvoices();
  }

  private async processInvoiceReminders() {
    await this.reminderService.checkAndSendReminders();
  }

  private async updateInvoiceStatuses() {
    const today = new Date();

    // Update overdue invoices
    await prisma.invoice.updateMany({
      where: {
        status: "PENDING",
        dueDate: {
          lt: today,
        },
      },
      data: {
        status: "OVERDUE",
      },
    });

    // Log status changes
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "OVERDUE",
        updatedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    for (const invoice of overdueInvoices) {
      logger.info(`Invoice ${invoice.id} marked as overdue`);
    }
  }

  private async generateMonthlyAnalytics() {
    const users = await prisma.user.findMany({
      where: {
        invoices: {
          some: {},
        },
      },
    });

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    const endOfLastMonth = new Date(
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1,
      0
    );

    for (const user of users) {
      try {
        const analytics = await this.analyticsService.getInvoiceAnalytics(
          user.id,
          {
            startDate: lastMonth,
            endDate: endOfLastMonth,
            groupBy: "month",
          }
        );

        // Store monthly analytics
        await prisma.monthlyAnalytics.create({
          data: {
            userId: user.id,
            month: lastMonth,
            data: analytics,
            totalInvoices: analytics.summary.totalInvoices,
            totalAmount: analytics.summary.totalAmount,
            paidAmount: analytics.summary.paidAmount,
          },
        });

        // Optionally send email report
        // await this.emailService.sendMonthlyReport(user.email, analytics);
      } catch (error) {
        logger.error(`Error generating analytics for user ${user.id}:`, error);
      }
    }
  }

  private async cleanupTemporaryFiles() {
    // Implementation depends on your file storage system
    // Example for local file system:
    const fs = require("fs").promises;
    const path = require("path");
    const tempDir = path.join(__dirname, "../../temp");

    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < oneDayAgo) {
          await fs.unlink(filePath);
          logger.info(`Deleted old temporary file: ${file}`);
        }
      }
    } catch (error) {
      logger.error("Error cleaning up temporary files:", error);
    }
  }
}
