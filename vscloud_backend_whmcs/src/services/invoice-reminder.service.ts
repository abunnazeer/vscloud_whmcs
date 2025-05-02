// src/services/invoice-reminder.service.ts - Updated version with sendManualReminder method
import { prisma } from "../config/database";
import { EmailService } from "./email.service";
import { InvoiceService } from "./invoice.service";

export class InvoiceReminderService {
  private emailService: EmailService;
  private invoiceService: InvoiceService;

  constructor() {
    this.emailService = new EmailService();
    this.invoiceService = new InvoiceService();
  }

  async sendManualReminder(
    invoiceId: string,
    userId: string,
    message?: string
  ): Promise<void> {
    // First, verify the user owns this invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      include: {
        user: true,
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Generate PDF if needed
    const attachmentPath = await this.invoiceService.generatePDF(
      invoiceId,
      userId
    );

    // Get default message if not provided
    const reminderMessage =
      message || this.getDefaultReminderMessage("manual", 0, invoice);

    // Get recipient email (either from recipient or user)
    const recipientEmail = invoice.user.email;

    // Send email
    await this.emailService.sendReminderEmail({
      to: recipientEmail,
      subject: `Invoice ${invoice.number} - Payment Reminder`,
      message: reminderMessage,
      attachmentPath,
    });

    // Update last reminder sent
    await prisma.invoice.update({
      where: { id: invoiceId },
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
        invoiceId,
        type: "manual",
        daysFromDue: this.calculateDaysFromDue(invoice.dueDate),
        successful: true,
      },
    });
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
        this.getDefaultReminderMessage(reminderType, days, invoice);

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
    days: number,
    invoice: any
  ): string {
    const messages: Record<string, string> = {
      upcoming: `
        Dear ${invoice.user.name},
        
        This is a friendly reminder that invoice ${invoice.number} for ${invoice.total} is due in ${days} days.
        
        To ensure timely processing, please make your payment before the due date.
        
        If you've already made the payment, please disregard this reminder.
        
        Thank you for your business!
      `,
      overdue: `
        Dear ${invoice.user.name},
        
        This is a reminder that invoice ${invoice.number} for ${invoice.total} was due ${days} days ago.
        
        Please make your payment as soon as possible to avoid any late fees or service interruptions.
        
        If you've already made the payment, please let us know so we can update our records.
        
        Thank you for your prompt attention to this matter.
      `,
      manual: `
        Dear ${invoice.user.name},
        
        This is a reminder regarding invoice ${invoice.number} for ${
        invoice.total
      } with due date ${invoice.dueDate.toLocaleDateString()}.
        
        Please process this payment at your earliest convenience.
        
        If you've already made the payment, please disregard this reminder.
        
        Thank you for your business!
      `,
    };

    return (messages[type] || messages.manual).trim();
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

  private calculateDaysFromDue(dueDate: Date): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
