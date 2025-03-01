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
        recipient: true,
      },
    });

    for (const recurring of recurringInvoices) {
      try {
        // Generate new invoice
        const invoice = await this.generateInvoice(recurring);

        // Send invoice if autoSend is enabled
        if (recurring.autoSend && invoice) {
          await this.emailService.sendInvoiceEmail({
            to: recurring.recipient.email,
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

    return await this.invoiceService.createInvoice({
      userId: recurring.userId,
      templateId: recurring.templateId,
      recipientId: recurring.recipientId,
      dueDate,
      amount: recurring.amount,
      description: recurring.description,
      metadata: {
        recurringInvoiceId: recurring.id,
      },
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
    recurringId: string,
    invoiceId: string | null,
    success: boolean,
    error?: any
  ) {
    await prisma.recurringInvoiceLog.create({
      data: {
        recurringInvoiceId: recurringId,
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
    return await prisma.recurringInvoice.update({
      where: {
        id_userId: {
          id,
          userId,
        },
      },
      data,
    });
  }

  async getRecurringSchedule(id: string, userId: string) {
    const schedule = await prisma.recurringInvoice.findUnique({
      where: {
        id_userId: {
          id,
          userId,
        },
      },
      include: {
        template: true,
        recipient: true,
        generationLogs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!schedule) {
      throw new Error("Recurring schedule not found");
    }

    return schedule;
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
          recipient: true,
          _count: {
            select: {
              generationLogs: true,
            },
          },
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
    // Instead of deleting, mark as cancelled
    return await prisma.recurringInvoice.update({
      where: {
        id_userId: {
          id,
          userId,
        },
      },
      data: {
        status: "CANCELLED",
        endDate: new Date(),
      },
    });
  }
}
