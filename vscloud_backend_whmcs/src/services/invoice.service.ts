// src/services/invoice.service.ts
import { prisma } from "../config/database";
import { Decimal } from "@prisma/client/runtime/library";
import { InvoiceStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export class InvoiceService {
  async generateInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1)
      .toString()
      .padStart(2, "0");

    // Get count of invoices for current month
    const invoiceCount = await prisma.invoice.count({
      where: {
        createdAt: {
          gte: new Date(currentYear, new Date().getMonth(), 1),
          lt: new Date(currentYear, new Date().getMonth() + 1, 1),
        },
      },
    });

    // Format: INV-YYYYMM-XXXX (e.g., INV-202402-0001)
    const sequenceNumber = (invoiceCount + 1).toString().padStart(4, "0");
    return `INV-${currentYear}${currentMonth}-${sequenceNumber}`;
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
    notes?: string;
  }) {
    // Calculate totals for each item
    const calculatedItems = data.items.map(item => {
      const subtotal = new Decimal(item.quantity * item.unitPrice);
      const tax = subtotal.mul(new Decimal(0.075)); // 7.5% VAT
      return {
        ...item,
        subtotal,
        tax,
        total: subtotal.plus(tax),
      };
    });

    // Calculate invoice totals
    const totals = calculatedItems.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal.plus(item.subtotal),
        tax: acc.tax.plus(item.tax),
        total: acc.total.plus(item.total),
      }),
      { subtotal: new Decimal(0), tax: new Decimal(0), total: new Decimal(0) }
    );

    const invoiceNumber = await this.generateInvoiceNumber();

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        userId: data.userId,
        number: invoiceNumber,
        status: InvoiceStatus.PENDING,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        dueDate: data.dueDate,
        notes: data.notes,
        items: {
          create: calculatedItems.map(item => ({
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
        user: {
          select: {
            name: true,
            email: true,
            billingAddress: true,
            billingCity: true,
            billingState: true,
            billingCountry: true,
            billingZip: true,
          },
        },
      },
    });

    return invoice;
  }

  async getInvoice(id: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        items: true,
        payments: true,
        user: {
          select: {
            name: true,
            email: true,
            billingAddress: true,
            billingCity: true,
            billingState: true,
            billingCountry: true,
            billingZip: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return invoice;
  }

  async listInvoices(
    userId: string,
    params: {
      status?: InvoiceStatus;
      startDate?: Date | undefined;
      endDate?: Date | undefined;
      page?: number | undefined;
      limit?: number | undefined;
    }
  ) {
    const { status, startDate, endDate, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          items: true,
          payments: {
            select: {
              amount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
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

  async updateInvoiceStatus(id: string, userId: string, status: InvoiceStatus) {
    const invoice = await this.getInvoice(id, userId);

    return await prisma.invoice.update({
      where: { id },
      data: { status },
    });
  }

  async generatePDF(invoiceId: string, userId: string): Promise<string> {
    const invoice = await this.getInvoice(invoiceId, userId);
    const doc = new PDFDocument({ margin: 50 });

    // Create directory if it doesn't exist
    const uploadsDir = path.join(__dirname, "../../uploads/invoices");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${invoice.number}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    // Pipe PDF to writeStream
    doc.pipe(writeStream);

    // Add content to PDF
    this.addPDFContent(doc, invoice);

    // Finalize PDF
    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => resolve(filePath));
      writeStream.on("error", reject);
    });
  }

  private addPDFContent(doc: PDFKit.PDFDocument, invoice: any) {
    // Add company logo
    // doc.image('path/to/logo.png', 50, 45, { width: 50 });

    // Add company info
    doc.fontSize(20).text("Your Company Name", 50, 50);
    doc.fontSize(10).text("123 Business Street");
    doc.text("City, State, ZIP");
    doc.text("Phone: (123) 456-7890");
    doc.moveDown();

    // Add invoice details
    doc.fontSize(16).text("INVOICE", { align: "right" });
    doc
      .fontSize(10)
      .text(`Invoice Number: ${invoice.number}`, { align: "right" });
    doc.text(`Date: ${invoice.createdAt.toLocaleDateString()}`, {
      align: "right",
    });
    doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, {
      align: "right",
    });
    doc.moveDown();

    // Add client info
    doc.fontSize(12).text("Bill To:");
    doc.fontSize(10).text(invoice.user.name);
    doc.text(invoice.user.billingAddress || "");
    doc.text(
      `${invoice.user.billingCity || ""}, ${invoice.user.billingState || ""}`
    );
    doc.text(invoice.user.billingCountry || "");
    doc.moveDown();

    // Add items table
    const tableTop = doc.y + 30;
    this.generateTable(doc, invoice.items, tableTop);

    // Add totals
    const totalsY = doc.y + 30;
    doc.text("Subtotal:", 400, totalsY);
    doc.text(`$${invoice.subtotal}`, 470, totalsY);
    doc.text("Tax:", 400, totalsY + 20);
    doc.text(`$${invoice.tax}`, 470, totalsY + 20);
    doc.text("Total:", 400, totalsY + 40);
    doc.text(`$${invoice.total}`, 470, totalsY + 40);

    // Add notes if any
    if (invoice.notes) {
      doc.moveDown();
      doc.fontSize(10).text("Notes:", 50);
      doc.text(invoice.notes);
    }

    // Add footer
    doc
      .fontSize(10)
      .text("Thank you for your business!", 50, doc.page.height - 50, {
        align: "center",
      });
  }

  private generateTable(doc: PDFKit.PDFDocument, items: any[], y: number) {
    // Add table headers
    doc
      .fontSize(10)
      .text("Description", 50, y)
      .text("Quantity", 200, y)
      .text("Unit Price", 300, y)
      .text("Amount", 400, y);

    // Add items
    let currentY = y + 20;
    items.forEach(item => {
      doc
        .text(item.description, 50, currentY)
        .text(item.quantity.toString(), 200, currentY)
        .text(`$${item.unitPrice}`, 300, currentY)
        .text(`$${item.total}`, 400, currentY);
      currentY += 20;
    });
  }
}
