// src/services/billing.service.ts
import { prisma } from "../config/database";
import { PaystackService } from "../integrations/paystack/paystack.service";
import { Decimal } from "@prisma/client/runtime/library";

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

  async createInvoice(data: {
    userId: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      type: string;
      relatedId?: string;
    }>;
    dueDate: Date;
  }) {
    const { userId, items, dueDate } = data;

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
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        number: this.generateInvoiceNumber(),
        subtotal: invoiceTotal.subtotal,
        tax: invoiceTotal.tax,
        total: invoiceTotal.total,
        dueDate,
        items: {
          create: calculations.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: new Decimal(item.unitPrice),
            subtotal: item.subtotal,
            tax: item.tax,
            total: item.total,
            type: item.type,
            relatedId: item.relatedId,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return invoice;
  }

  async initializePayment(data: {
    userId: string;
    invoiceId: string;
    email: string;
    callbackUrl: string;
  }) {
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

    const paymentResponse = await this.paystackService.initializeTransaction({
      amount: Number(invoice.total),
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
        userId: data.userId,
        invoiceId: invoice.id,
        amount: invoice.total,
        paymentMethod: "PAYSTACK",
        status: "PENDING",
        transactionId: paymentResponse.data.reference,
        currency: "NGN",
        metadata: paymentResponse.data,
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
        where: { transactionId: reference },
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
            status: "COMPLETED",
            metadata: {
              ...payment.metadata,
              verification: verification.data,
            },
          },
        }),
        prisma.invoice.update({
          where: { id: payment.invoiceId! },
          data: {
            status: "PAID",
            paidDate: new Date(),
          },
        }),
      ]);

      return { success: true, data: verification.data };
    }

    return { success: false, data: verification.data };
  }

  async refundPayment(data: {
    paymentId: string;
    amount?: number;
    reason: string;
  }) {
    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    const refundResponse = await this.paystackService.initiateRefund({
      transactionReference: payment.transactionId!,
      amount: data.amount,
      merchantNote: data.reason,
    });

    // Update payment and invoice status
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "REFUNDED",
          refundedAmount: new Decimal(data.amount || Number(payment.amount)),
          refundReason: data.reason,
        },
      }),
      prisma.invoice.update({
        where: { id: payment.invoiceId! },
        data: {
          status: "REFUNDED",
        },
      }),
    ]);

    return refundResponse;
  }

  async addCredit(data: {
    userId: string;
    amount: number;
    description: string;
    expiryDate?: Date;
  }) {
    return await prisma.credit.create({
      data: {
        userId: data.userId,
        amount: new Decimal(data.amount),
        description: data.description,
        expiryDate: data.expiryDate,
      },
    });
  }

  async getInvoiceHistory(
    userId: string,
    params: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { status, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status }),
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

  async getAvailableCredits(userId: string) {
    const credits = await prisma.credit.findMany({
      where: {
        userId,
        isUsed: false,
        OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
      },
    });

    const totalCredit = credits.reduce(
      (sum, credit) => sum.plus(credit.amount),
      new Decimal(0)
    );

    return {
      credits,
      totalAmount: totalCredit,
    };
  }
}
