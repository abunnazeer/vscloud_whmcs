// src/services/billing.service.ts
import { prisma } from "../config/database";
import { PaystackService } from "../integrations/paystack/paystack.service";
import { Decimal } from "@prisma/client/runtime/library";
import { InvoiceStatus, PaymentStatus, Prisma } from "@prisma/client";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  type: string;
  relatedId?: string;
}

interface InvoiceData {
  userId: string;
  items: InvoiceItem[];
  dueDate: Date;
  notes?: string;
  recipientId?: string;
}

interface PaymentInitialization {
  userId: string;
  invoiceId: string;
  email: string;
  callbackUrl: string;
}

interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}

interface CreditData {
  userId: string;
  amount: number;
  description: string;
  expiryDate?: Date;
}

interface InvoiceFilter {
  status?: string;
  page?: number;
  limit?: number;
}

export class BillingService {
  private paystackService: PaystackService;

  constructor() {
    this.paystackService = new PaystackService();
  }

  private generateInvoiceNumber(): string {
    const prefix = "INV";
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${timestamp}-${random}`;
  }

  async createInvoice(data: InvoiceData) {
    const { userId, items, dueDate, notes, recipientId } = data;

    // Calculate totals
    const calculations = items.map(item => ({
      ...item,
      subtotal: new Decimal(item.quantity * item.unitPrice),
      tax: new Decimal(item.quantity * item.unitPrice * 0.075), // 7.5% VAT
      total: new Decimal(item.quantity * item.unitPrice * 1.075),
    }));

    const invoiceTotal = calculations.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal.plus(item.subtotal),
        tax: acc.tax.plus(item.tax),
        total: acc.total.plus(item.total),
      }),
      { subtotal: new Decimal(0), tax: new Decimal(0), total: new Decimal(0) }
    );

    // Create invoice with items
    try {
      const invoice = await prisma.invoice.create({
        data: {
          userId,
          number: this.generateInvoiceNumber(),
          // Convert Decimal to number for total
          total: Number(invoiceTotal.total),
          status: "PENDING" as InvoiceStatus,
          dueDate,
          notes: notes || null,
          recipientId: recipientId || null,
          items: {
            create: calculations.map(item => ({
              description: item.description,
              quantity: item.quantity,
              price: Number(item.unitPrice),
              total: Number(item.total),
              type: item.type,
              relatedId: item.relatedId || null,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return invoice;
    } catch (error) {
      console.error("Error creating invoice:", error);
      throw error;
    }
  }

  // In billing.service.ts - Update the initializePayment method

  async initializePayment(data: PaymentInitialization) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { user: true },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.userId !== data.userId) {
      throw new Error("Unauthorized access to invoice");
    }

    // Fix: Ensure amount is an integer (in kobo) with no decimal places
    const amountInKobo = Math.round(Number(invoice.total) * 100);

    const paymentResponse = await this.paystackService.initializeTransaction({
      amount: amountInKobo, // Now correctly formatted as an integer
      email: data.email,
      reference: `inv_${invoice.id}`,
      callbackUrl: data.callbackUrl,
      metadata: {
        invoice_id: invoice.id,
        user_id: data.userId,
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: Number(invoice.total),
        status: "PENDING" as PaymentStatus,
        reference: paymentResponse.data.reference,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return paymentResponse;
  }

  async verifyPayment(reference: string) {
    const verification = await this.paystackService.verifyTransaction(
      reference
    );

    if (verification.data.status === "success") {
      const payment = await prisma.payment.findFirst({
        where: { reference },
        include: { invoice: true },
      });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      // Update payment and invoice status
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED" as PaymentStatus,
            updatedAt: new Date(),
          },
        }),
        prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            status: "PAID" as InvoiceStatus,
            paidDate: new Date(),
            updatedAt: new Date(),
          },
        }),
      ]);

      return { success: true, data: verification.data };
    }

    return { success: false, data: verification.data };
  }

  // In billing.service.ts - Update the refundPayment method

  async refundPayment(data: RefundRequest) {
    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    // If a specific refund amount is provided, validate it
    if (data.amount !== undefined) {
      // Paystack minimum refund amount is NGN50
      if (data.amount < 50) {
        throw new Error("Refund amount cannot be less than NGN50");
      }

      // Also ensure the refund amount is not greater than the original payment
      if (data.amount > Number(payment.amount)) {
        throw new Error(
          "Refund amount cannot exceed the original payment amount"
        );
      }
    }

    const refundResponse = await this.paystackService.initiateRefund({
      transactionReference: payment.reference!,
      amount: data.amount ? Math.round(Number(data.amount) * 100) : undefined, // Convert to kobo and ensure integer
      merchantNote: data.reason,
    });

    // Update payment and invoice status
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "REFUNDED" as PaymentStatus,
          updatedAt: new Date(),
        },
      }),
      prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: "CANCELLED" as InvoiceStatus,
          updatedAt: new Date(),
        },
      }),
    ]);

    return refundResponse;
  }
  async getInvoiceHistory(userId: string, params: InvoiceFilter) {
    const { status, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    // Create a properly typed where condition
    const where: Prisma.InvoiceWhereInput = {
      userId,
      // Only add status if it's provided and cast it to InvoiceStatus
      ...(status && { status: status as InvoiceStatus }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          items: true,
          payments: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoiceById(invoiceId: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: userId,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return invoice;
  }
}
