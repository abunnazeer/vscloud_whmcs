// src/services/invoice-reminder.service.ts
import { prisma } from "../config/database";
import { EmailService } from "./email.service";
import { InvoiceService } from "./invoice.service";

export class InvoiceReminderService {
  sendManualReminder(invoiceId: any, userId: any, message: any) {
    throw new Error("Method not implemented.");
  }
  private emailService: EmailService;
  private invoiceService: InvoiceService;

  constructor() {
    this.emailService = new EmailService();
    this.invoiceService = new InvoiceService();
  }

  async checkAndSendReminders() {
    const today = new Date();
    const reminderSettings = await prisma.reminderSettings.findMany({
      where: { enabled: true },
    });

    for (const settings of reminderSettings) {
      // Before due date reminders
      for (const days of settings.beforeDueDays) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);

        const invoices = await prisma.invoice.findMany({
          where: {
            dueDate: {
              gte: dueDate,
              lt: new Date(dueDate.getTime() + 24 * 60 * 60 * 1000),
            },
            status: "PENDING",
            lastReminderSent: {
              lt: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Only send one reminder per day
            },
          },
          include: {
            user: true,
          },
        });

        for (const invoice of invoices) {
          await this.sendReminder(invoice, true, days);
        }
      }

      // After due date reminders
      for (const days of settings.afterDueDays) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() - days);

        const invoices = await prisma.invoice.findMany({
          where: {
            dueDate: {
              gte: dueDate,
              lt: new Date(dueDate.getTime() + 24 * 60 * 60 * 1000),
            },
            status: "OVERDUE",
            lastReminderSent: {
              lt: new Date(today.getTime() - 24 * 60 * 60 * 1000),
            },
          },
          include: {
            user: true,
          },
        });

        for (const invoice of invoices) {
          await this.sendReminder(invoice, false, days);
        }
      }
    }
  }

  private async sendReminder(invoice: any, isBeforeDue: boolean, days: number) {
    try {
      // Generate PDF if needed
      let attachmentPath: string | undefined;
      if (invoice.settings?.includeAttachment) {
        attachmentPath = await this.invoiceService.generatePDF(
          invoice.id,
          invoice.userId
        );
      }

      const reminderType = isBeforeDue ? "upcoming" : "overdue";
      const daysText = isBeforeDue ? `in ${days} days` : `${days} days ago`;

      const message =
        invoice.settings?.customMessage
          ?.replace("{{days}}", daysText)
          ?.replace("{{amount}}", invoice.total.toString())
          ?.replace("{{dueDate}}", invoice.dueDate.toLocaleDateString()) ||
        this.getDefaultReminderMessage(reminderType, daysText, invoice);

      // Send email
      await this.emailService.sendReminderEmail({
        to: invoice.user.email,
        subject: `Invoice ${invoice.number} - ${
          isBeforeDue ? "Payment Due Soon" : "Payment Overdue"
        }`,
        message,
        attachmentPath,
      });

      // Update last reminder sent
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          lastReminderSent: new Date(),
          remindersSent: {
            increment: 1,
          },
        },
      });

      // Log reminder
      await prisma.reminderLog.create({
        data: {
          invoiceId: invoice.id,
          type: reminderType,
          daysFromDue: isBeforeDue ? days : -days,
          successful: true,
        },
      });
    } catch (error) {
      console.error(
        `Failed to send reminder for invoice ${invoice.id}:`,
        error
      );

      // Log failed reminder
      await prisma.reminderLog.create({
        data: {
          invoiceId: invoice.id,
          type: isBeforeDue ? "upcoming" : "overdue",
          daysFromDue: isBeforeDue ? days : -days,
          successful: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  private getDefaultReminderMessage(
    type: string,
    daysText: string,
    invoice: any
  ): string {
    const messages = {
      upcoming: `
        Dear ${invoice.user.name},
        
        This is a friendly reminder that invoice ${invoice.number} for ${invoice.total} is due ${daysText}.
        
        To ensure timely processing, please make your payment before the due date.
        
        If you've already made the payment, please disregard this reminder.
        
        Thank you for your business!
      `,
      overdue: `
        Dear ${invoice.user.name},
        
        This is a reminder that invoice ${invoice.number} for ${invoice.total} was due ${daysText}.
        
        Please make your payment as soon as possible to avoid any late fees or service interruptions.
        
        If you've already made the payment, please let us know so we can update our records.
        
        Thank you for your prompt attention to this matter.
      `,
    };

    return messages[type].trim();
  }

  async updateReminderSettings(
    userId: string,
    settings: {
      enabled: boolean;
      beforeDueDays: number[];
      afterDueDays: number[];
      includeAttachment: boolean;
      customMessage?: string;
    }
  ) {
    return await prisma.reminderSettings.upsert({
      where: { userId },
      update: settings,
      create: {
        userId,
        ...settings,
      },
    });
  }

  async getReminderHistory(invoiceId: string) {
    return await prisma.reminderLog.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
    });
  }
}
