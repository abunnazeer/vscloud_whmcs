// src/services/recurring-invoice.service.ts
import { prisma } from "../config/database";
import { InvoiceService } from "./invoice.service";
import { EmailService } from "./email.service";

export class RecurringInvoiceService {
  private invoiceService: InvoiceService;
  private emailService: EmailService;

  constructor() {
    this.invoiceService = new InvoiceService();
    this.emailService = new EmailService();
  }

  async createRecurringSchedule(data: {
    userId: string;
    templateId: string;
    frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
    startDate: Date;
    endDate?: Date;
    recipientId: string;
    autoSend: boolean;
    amount?: number;
    description?: string;
  }) {
    return await prisma.recurringInvoice.create({
      data: {
        userId: data.userId,
        templateId: data.templateId,
        frequency: data.frequency,
        startDate: data.startDate,
        endDate: data.endDate,
        recipientId: data.recipientId,
        autoSend: data.autoSend,
        amount: data.amount,
        description: data.description,
        nextGenerationDate: data.startDate,
        status: "ACTIVE",
      },
    });
  }

  async processRecurringInvoices() {
    const today = new Date();
    const recurringInvoices = await prisma.recurringInvoice.findMany({
      where: {
        status: "ACTIVE",
        nextGenerationDate: {
          lte: today,
        },
        OR: [{ endDate: null }, { endDate: { gt: today } }],
      },
      include: {
        template: true,
      },
    });

    for (const recurring of recurringInvoices) {
      try {
        // Get user data for the recipient
        const user = await prisma.user.findUnique({
          where: { id: recurring.recipientId },
          select: { email: true },
        });

        if (!user) {
          throw new Error(`Recipient not found: ${recurring.recipientId}`);
        }

        // Generate new invoice
        const invoice = await this.generateInvoice(recurring);

        // Send invoice if autoSend is enabled
        if (recurring.autoSend && invoice && user.email) {
          await this.emailService.sendInvoiceEmail({
            to: user.email,
            invoiceId: invoice.id,
            template: "recurring-invoice",
          });
        }

        // Update next generation date
        await this.updateNextGenerationDate(recurring);

        // Log successful generation
        await this.logGeneration(recurring.id, invoice.id, true);
      } catch (error) {
        console.error(
          `Failed to process recurring invoice ${recurring.id}:`,
          error
        );
        await this.logGeneration(recurring.id, null, false, error);
      }
    }
  }

  private async generateInvoice(recurring: any) {
    const dueDate = this.calculateDueDate(recurring.frequency);

    // Map the data for invoice creation
    return await this.invoiceService.createInvoice({
      userId: recurring.userId,
      items: [], // Needs to be populated based on template
      dueDate,
      notes: recurring.description || undefined,
      templateId: recurring.templateId,
      recipientId: recurring.recipientId,
    });
  }

  private async updateNextGenerationDate(recurring: any) {
    const nextDate = this.calculateNextGenerationDate(
      recurring.frequency,
      recurring.nextGenerationDate
    );

    await prisma.recurringInvoice.update({
      where: { id: recurring.id },
      data: {
        nextGenerationDate: nextDate,
        lastGenerationDate: new Date(),
      },
    });
  }

  private calculateNextGenerationDate(
    frequency: string,
    currentDate: Date
  ): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case "WEEKLY":
        next.setDate(next.getDate() + 7);
        break;
      case "MONTHLY":
        next.setMonth(next.getMonth() + 1);
        break;
      case "QUARTERLY":
        next.setMonth(next.getMonth() + 3);
        break;
      case "ANNUALLY":
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  private calculateDueDate(frequency: string): Date {
    const dueDate = new Date();

    // Default due date is 14 days from generation
    dueDate.setDate(dueDate.getDate() + 14);

    return dueDate;
  }

  private async logGeneration(
    recurringInvoiceId: string,
    invoiceId: string | null,
    success: boolean,
    error?: any
  ) {
    await prisma.recurringInvoiceLog.create({
      data: {
        recurringInvoiceId,
        invoiceId,
        success,
        error: error ? error.message : null,
      },
    });
  }

  async updateRecurringSchedule(
    id: string,
    userId: string,
    data: {
      frequency?: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
      endDate?: Date | null;
      autoSend?: boolean;
      amount?: number;
      description?: string;
      status?: "ACTIVE" | "PAUSED" | "CANCELLED";
    }
  ) {
    // Find first to verify ownership
    const recurringInvoice = await prisma.recurringInvoice.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!recurringInvoice) {
      throw new Error("Recurring invoice not found");
    }

    return await prisma.recurringInvoice.update({
      where: { id },
      data,
    });
  }

  async getRecurringSchedule(id: string, userId: string) {
    const schedule = await prisma.recurringInvoice.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        template: true,
      },
    });

    if (!schedule) {
      throw new Error("Recurring schedule not found");
    }

    return schedule;
  }

  async getGenerationLogs(recurringId: string, userId: string) {
    // First, verify the user owns this recurring invoice schedule
    const schedule = await prisma.recurringInvoice.findFirst({
      where: {
        id: recurringId,
        userId,
      },
    });

    if (!schedule) {
      throw new Error("Recurring invoice schedule not found");
    }

    // Fetch the generation logs
    return await prisma.recurringInvoiceLog.findMany({
      where: {
        recurringInvoiceId: recurringId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async listRecurringSchedules(
    userId: string,
    params: {
      status?: "ACTIVE" | "PAUSED" | "CANCELLED";
      recipientId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { status, recipientId, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status }),
      ...(recipientId && { recipientId }),
    };

    const [schedules, total] = await Promise.all([
      prisma.recurringInvoice.findMany({
        where,
        include: {
          template: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.recurringInvoice.count({ where }),
    ]);

    return {
      schedules,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deleteRecurringSchedule(id: string, userId: string) {
    // Find first to verify ownership
    const recurringInvoice = await prisma.recurringInvoice.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!recurringInvoice) {
      throw new Error("Recurring invoice not found");
    }

    // Instead of deleting, mark as cancelled
    return await prisma.recurringInvoice.update({
      where: { id },
      data: {
        status: "CANCELLED",
        endDate: new Date(),
      },
    });
  }
}
