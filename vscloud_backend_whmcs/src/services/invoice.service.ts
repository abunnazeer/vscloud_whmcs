// // src/services/invoice.service.ts
// import { prisma } from "../config/database";
// import { Decimal } from "@prisma/client/runtime/library";
// import { InvoiceStatus } from "@prisma/client";
// import PDFDocument from "pdfkit";
// import fs from "fs";
// import path from "path";

// export class InvoiceService {
//   async generateInvoiceNumber(): Promise<string> {
//     const currentYear = new Date().getFullYear();
//     const currentMonth = (new Date().getMonth() + 1)
//       .toString()
//       .padStart(2, "0");

//     const invoiceCount = await prisma.invoice.count({
//       where: {
//         createdAt: {
//           gte: new Date(currentYear, new Date().getMonth(), 1),
//           lt: new Date(currentYear, new Date().getMonth() + 1, 1),
//         },
//       },
//     });

//     const sequenceNumber = (invoiceCount + 1).toString().padStart(4, "0");
//     return `INV-${currentYear}${currentMonth}-${sequenceNumber}`;
//   }

//   async createInvoice(data: {
//     userId: string;
//     items: Array<{
//       description: string;
//       quantity: number;
//       unitPrice: number;
//       type: string;
//       relatedId?: string;
//     }>;
//     dueDate: Date;
//     notes?: string;
//   }) {
//     // Calculate totals for each item
//     const calculatedItems = data.items.map(item => {
//       const subtotal = new Decimal(item.quantity * item.unitPrice);
//       const tax = subtotal.mul(new Decimal(0.075)); // 7.5% VAT
//       const total = subtotal.plus(tax);
//       return {
//         ...item,
//         subtotal: Number(subtotal),
//         tax: Number(tax),
//         total: Number(total),
//       };
//     });

//     // Calculate invoice totals
//     const totals = calculatedItems.reduce(
//       (acc, item) => ({
//         subtotal: acc.subtotal + item.subtotal,
//         tax: acc.tax + item.tax,
//         total: acc.total + item.total,
//       }),
//       { subtotal: 0, tax: 0, total: 0 }
//     );

//     const invoiceNumber = await this.generateInvoiceNumber();

//     // Create invoice with items
//     const invoice = await prisma.invoice.create({
//       data: {
//         number: invoiceNumber,
//         userId: data.userId,
//         total: totals.total,
//         status: "DRAFT",
//         dueDate: data.dueDate,
//         notes: data.notes || null,
//         items: {
//           create: calculatedItems.map(item => ({
//             description: item.description,
//             quantity: item.quantity,
//             price: item.unitPrice,
//             total: item.total,
//             type: item.type,
//             relatedId: item.relatedId,
//           })),
//         },
//       },
//       include: {
//         items: true,
//       },
//     });

//     return invoice;
//   }

//   async getInvoice(id: string, userId: string) {
//     const invoice = await prisma.invoice.findFirst({
//       where: {
//         id: id,
//         userId: userId,
//       },
//       include: {
//         items: true,
//         payments: true,
//         user: {
//           select: {
//             name: true,
//             email: true,
//             billingAddress: true,
//             billingCity: true,
//             billingState: true,
//             billingCountry: true,
//             billingZip: true,
//           },
//         },
//       },
//     });

//     if (!invoice) {
//       throw new Error("Invoice not found");
//     }

//     return invoice;
//   }

//   async listInvoices(
//     userId: string,
//     params: {
//       status?: InvoiceStatus;
//       startDate?: Date | undefined;
//       endDate?: Date | undefined;
//       page?: number | undefined;
//       limit?: number | undefined;
//     }
//   ) {
//     const { status, startDate, endDate, page = 1, limit = 10 } = params;
//     const skip = (page - 1) * limit;

//     const where = {
//       userId,
//       ...(status && { status }),
//       ...(startDate &&
//         endDate && {
//           createdAt: {
//             gte: startDate,
//             lte: endDate,
//           },
//         }),
//     };

//     const [invoices, total] = await Promise.all([
//       prisma.invoice.findMany({
//         where,
//         include: {
//           items: true,
//           payments: {
//             select: {
//               amount: true,
//               status: true,
//               createdAt: true,
//             },
//           },
//         },
//         orderBy: {
//           createdAt: "desc",
//         },
//         skip,
//         take: limit,
//       }),
//       prisma.invoice.count({ where }),
//     ]);

//     return {
//       invoices,
//       pagination: {
//         total,
//         page,
//         limit,
//         pages: Math.ceil(total / limit),
//       },
//     };
//   }

//   async updateInvoiceStatus(id: string, userId: string, status: InvoiceStatus) {
//     const invoice = await this.getInvoice(id, userId);

//     return await prisma.invoice.update({
//       where: { id },
//       data: { status },
//     });
//   }

//   async generatePDF(invoiceId: string, userId: string): Promise<string> {
//     const invoice = await this.getInvoice(invoiceId, userId);
//     const doc = new PDFDocument({ margin: 50 });

//     const uploadsDir = path.join(__dirname, "../../uploads/invoices");
//     if (!fs.existsSync(uploadsDir)) {
//       fs.mkdirSync(uploadsDir, { recursive: true });
//     }

//     const fileName = `${invoice.number}.pdf`;
//     const filePath = path.join(uploadsDir, fileName);
//     const writeStream = fs.createWriteStream(filePath);

//     doc.pipe(writeStream);
//     this.addPDFContent(doc, invoice);
//     doc.end();

//     return new Promise((resolve, reject) => {
//       writeStream.on("finish", () => resolve(filePath));
//       writeStream.on("error", reject);
//     });
//   }

//   private addPDFContent(doc: PDFKit.PDFDocument, invoice: any) {
//     doc.fontSize(20).text("Your Company Name", 50, 50);
//     doc.fontSize(10).text("123 Business Street");
//     doc.text("City, State, ZIP");
//     doc.text("Phone: (123) 456-7890");
//     doc.moveDown();

//     doc.fontSize(16).text("INVOICE", { align: "right" });
//     doc
//       .fontSize(10)
//       .text(`Invoice Number: ${invoice.number}`, { align: "right" });
//     doc.text(`Date: ${invoice.createdAt.toLocaleDateString()}`, {
//       align: "right",
//     });
//     doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, {
//       align: "right",
//     });
//     doc.moveDown();

//     doc.fontSize(12).text("Bill To:");
//     doc.fontSize(10).text(invoice.user.name);
//     doc.text(invoice.user.billingAddress || "");
//     doc.text(
//       `${invoice.user.billingCity || ""}, ${invoice.user.billingState || ""}`
//     );
//     doc.text(invoice.user.billingCountry || "");
//     doc.moveDown();

//     const tableTop = doc.y + 30;
//     this.generateTable(doc, invoice.items, tableTop);

//     const subtotal = invoice.items.reduce(
//       (sum: number, item: any) => sum + item.price * item.quantity,
//       0
//     );
//     const tax = subtotal * 0.075;
//     const total = subtotal + tax;

//     const totalsY = doc.y + 30;
//     doc.text("Subtotal:", 400, totalsY);
//     doc.text(`$${subtotal.toFixed(2)}`, 470, totalsY);
//     doc.text("Tax (7.5%):", 400, totalsY + 20);
//     doc.text(`$${tax.toFixed(2)}`, 470, totalsY + 20);
//     doc.text("Total:", 400, totalsY + 40);
//     doc.text(`$${total.toFixed(2)}`, 470, totalsY + 40);

//     if (invoice.notes) {
//       doc.moveDown();
//       doc.fontSize(10).text("Notes:", 50);
//       doc.text(invoice.notes);
//     }

//     doc
//       .fontSize(10)
//       .text("Thank you for your business!", 50, doc.page.height - 50, {
//         align: "center",
//       });
//   }

//   private generateTable(doc: PDFKit.PDFDocument, items: any[], y: number) {
//     doc
//       .fontSize(10)
//       .text("Description", 50, y)
//       .text("Quantity", 200, y)
//       .text("Unit Price", 300, y)
//       .text("Amount", 400, y);

//     let currentY = y + 20;
//     items.forEach(item => {
//       doc
//         .text(item.description, 50, currentY)
//         .text(item.quantity.toString(), 200, currentY)
//         .text(`$${item.price.toFixed(2)}`, 300, currentY)
//         .text(`$${(item.price * item.quantity).toFixed(2)}`, 400, currentY);
//       currentY += 20;
//     });
//   }

//   async sendInvoiceByEmail(
//     invoiceId: string,
//     userId: string,
//     email: string,
//     message: string
//   ): Promise<void> {
//     const invoice = await this.getInvoice(invoiceId, userId);
//     if (!invoice) {
//       throw new Error("Invoice not found");
//     }

//     const pdfPath = await this.generatePDF(invoiceId, userId);
//     console.log(
//       `Sending invoice ${invoiceId} to ${email} with message: ${message}`
//     );
//     // TODO: Implement actual email sending logic
//   }

//   async createRecurringInvoices(params: {
//     userId: string;
//     templateId: string;
//     frequency: "daily" | "weekly" | "monthly" | "yearly";
//     startDate: Date;
//     endDate?: Date;
//   }): Promise<any[]> {
//     // TODO: Implement recurring invoice logic
//     console.log("Creating recurring invoices with params:", params);
//     return [];
//   }

//   async getInvoiceAnalytics(
//     userId: string,
//     params: {
//       startDate?: Date;
//       endDate?: Date;
//     }
//   ): Promise<any> {
//     const where = {
//       userId,
//       ...(params.startDate &&
//         params.endDate && {
//           createdAt: {
//             gte: params.startDate,
//             lte: params.endDate,
//           },
//         }),
//     };

//     const [totalInvoices, paidInvoices, pendingInvoices, overdueInvoices] =
//       await Promise.all([
//         prisma.invoice.count({ where }),
//         prisma.invoice.count({
//           where: {
//             ...where,
//             status: "PAID",
//           },
//         }),
//         prisma.invoice.count({
//           where: {
//             ...where,
//             status: "PENDING",
//           },
//         }),
//         prisma.invoice.count({
//           where: {
//             ...where,
//             status: "OVERDUE",
//           },
//         }),
//       ]);

//     const amountAggregations = await prisma.invoice.aggregate({
//       where,
//       _sum: {
//         total: true,
//       },
//     });

//     const paidAmountAggregation = await prisma.invoice.aggregate({
//       where: {
//         ...where,
//         status: "PAID",
//       },
//       _sum: {
//         total: true,
//       },
//     });

//     return {
//       totalInvoices,
//       paidInvoices,
//       pendingInvoices,
//       overdueInvoices,
//       totalAmount: amountAggregations._sum.total || 0,
//       paidAmount: paidAmountAggregation._sum.total || 0,
//       pendingAmount:
//         (amountAggregations._sum.total || 0) -
//         (paidAmountAggregation._sum.total || 0),
//       overdueAmount: 0, // You might want to calculate this based on due dates
//     };
//   }
// }

// src/services/invoice.service.ts
import { prisma } from "../config/database";
import { Decimal } from "@prisma/client/runtime/library";
import { InvoiceStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import {
  InvoiceData,
  InvoiceFilter,
} from "../models/interfaces/invoice.interface";

export class InvoiceService {
  async generateInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1)
      .toString()
      .padStart(2, "0");

    const invoiceCount = await prisma.invoice.count({
      where: {
        createdAt: {
          gte: new Date(currentYear, new Date().getMonth(), 1),
          lt: new Date(currentYear, new Date().getMonth() + 1, 1),
        },
      },
    });

    const sequenceNumber = (invoiceCount + 1).toString().padStart(4, "0");
    return `INV-${currentYear}${currentMonth}-${sequenceNumber}`;
  }

  async createInvoice(data: InvoiceData) {
    // Calculate totals for each item
    const calculatedItems = data.items.map(item => {
      const subtotal = new Decimal(item.quantity * item.unitPrice);
      const tax = subtotal.mul(new Decimal(0.075)); // 7.5% VAT
      const total = subtotal.plus(tax);
      return {
        ...item,
        subtotal: Number(subtotal),
        tax: Number(tax),
        total: Number(total),
      };
    });

    // Calculate invoice totals
    const totals = calculatedItems.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + item.subtotal,
        tax: acc.tax + item.tax,
        total: acc.total + item.total,
      }),
      { subtotal: 0, tax: 0, total: 0 }
    );

    const invoiceNumber = await this.generateInvoiceNumber();

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        userId: data.userId,
        total: totals.total,
        status: "DRAFT",
        dueDate: data.dueDate,
        notes: data.notes || null,
        templateId: data.templateId || null,
        recipientId: data.recipientId || null,
        items: {
          create: calculatedItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.unitPrice,
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

  async getInvoice(id: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        userId: userId,
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
        template: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return invoice;
  }

  async listInvoices(userId: string, params: InvoiceFilter) {
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
          template: {
            select: {
              name: true,
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

    const updateData: any = { status };

    // If marking as paid, record the payment date
    if (status === "PAID" && invoice.status !== "PAID") {
      updateData.paidDate = new Date();
    }

    return await prisma.invoice.update({
      where: { id },
      data: updateData,
    });
  }

  async generatePDF(invoiceId: string, userId: string): Promise<string> {
    const invoice = await this.getInvoice(invoiceId, userId);
    const doc = new PDFDocument({ margin: 50 });

    const uploadsDir = path.join(__dirname, "../../uploads/invoices");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${invoice.number}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);
    this.addPDFContent(doc, invoice);
    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => resolve(filePath));
      writeStream.on("error", reject);
    });
  }

  private addPDFContent(doc: PDFKit.PDFDocument, invoice: any) {
    doc.fontSize(20).text("Your Company Name", 50, 50);
    doc.fontSize(10).text("123 Business Street");
    doc.text("City, State, ZIP");
    doc.text("Phone: (123) 456-7890");
    doc.moveDown();

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

    doc.fontSize(12).text("Bill To:");
    doc.fontSize(10).text(invoice.user.name);
    doc.text(invoice.user.billingAddress || "");
    doc.text(
      `${invoice.user.billingCity || ""}, ${invoice.user.billingState || ""}`
    );
    doc.text(invoice.user.billingCountry || "");
    doc.moveDown();

    const tableTop = doc.y + 30;
    this.generateTable(doc, invoice.items, tableTop);

    const subtotal = invoice.items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * 0.075;
    const total = subtotal + tax;

    const totalsY = doc.y + 30;
    doc.text("Subtotal:", 400, totalsY);
    doc.text(`$${subtotal.toFixed(2)}`, 470, totalsY);
    doc.text("Tax (7.5%):", 400, totalsY + 20);
    doc.text(`$${tax.toFixed(2)}`, 470, totalsY + 20);
    doc.text("Total:", 400, totalsY + 40);
    doc.text(`$${total.toFixed(2)}`, 470, totalsY + 40);

    if (invoice.notes) {
      doc.moveDown();
      doc.fontSize(10).text("Notes:", 50);
      doc.text(invoice.notes);
    }

    doc
      .fontSize(10)
      .text("Thank you for your business!", 50, doc.page.height - 50, {
        align: "center",
      });
  }

  private generateTable(doc: PDFKit.PDFDocument, items: any[], y: number) {
    doc
      .fontSize(10)
      .text("Description", 50, y)
      .text("Quantity", 200, y)
      .text("Unit Price", 300, y)
      .text("Amount", 400, y);

    let currentY = y + 20;
    items.forEach(item => {
      doc
        .text(item.description, 50, currentY)
        .text(item.quantity.toString(), 200, currentY)
        .text(`$${item.price.toFixed(2)}`, 300, currentY)
        .text(`$${(item.price * item.quantity).toFixed(2)}`, 400, currentY);
      currentY += 20;
    });
  }

  async sendInvoiceByEmail(
    invoiceId: string,
    userId: string,
    email: string,
    message: string
  ): Promise<void> {
    const invoice = await this.getInvoice(invoiceId, userId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const pdfPath = await this.generatePDF(invoiceId, userId);
    console.log(
      `Sending invoice ${invoiceId} to ${email} with message: ${message}`
    );
    // TODO: Implement actual email sending logic
  }

  async createRecurringInvoices(params: {
    userId: string;
    templateId: string;
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    startDate: Date;
    endDate?: Date | undefined;
    recipientId?: string | undefined;
  }): Promise<any[]> {
    // TODO: Implement recurring invoice logic
    console.log("Creating recurring invoices with params:", params);
    return [];
  }

  async getInvoiceAnalytics(
    userId: string,
    params: {
      startDate?: Date | undefined;
      endDate?: Date | undefined;
    }
  ): Promise<any> {
    const where = {
      userId,
      ...(params.startDate &&
        params.endDate && {
          createdAt: {
            gte: params.startDate,
            lte: params.endDate,
          },
        }),
    };

    const [totalInvoices, paidInvoices, pendingInvoices, overdueInvoices] =
      await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.count({
          where: {
            ...where,
            status: "PAID",
          },
        }),
        prisma.invoice.count({
          where: {
            ...where,
            status: "PENDING",
          },
        }),
        prisma.invoice.count({
          where: {
            ...where,
            status: "OVERDUE",
          },
        }),
      ]);

    const amountAggregations = await prisma.invoice.aggregate({
      where,
      _sum: {
        total: true,
      },
    });

    const paidAmountAggregation = await prisma.invoice.aggregate({
      where: {
        ...where,
        status: "PAID",
      },
      _sum: {
        total: true,
      },
    });

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalAmount: amountAggregations._sum.total || 0,
      paidAmount: paidAmountAggregation._sum.total || 0,
      pendingAmount:
        (amountAggregations._sum.total || 0) -
        (paidAmountAggregation._sum.total || 0),
      overdueAmount: 0, // You might want to calculate this based on due dates
    };
  }
}
