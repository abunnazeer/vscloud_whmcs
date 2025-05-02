// src/controllers/invoice.controller.ts
import { Request, Response } from "express";
import { InvoiceService } from "../services/invoice.service";
import { InvoiceStatus } from "@prisma/client";
import fs from "fs";

export class InvoiceController {
  private invoiceService: InvoiceService;

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  public createInvoice = async (req: Request, res: Response): Promise<void> => {
    console.log("hello");
    try {
      // Debug logs to understand what's being received
      console.log("Request headers:", req.headers);
      console.log("Request body type:", typeof req.body);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("Items in body:", req.body?.items ? "Present" : "Missing");

      const userId = req.user?.id;
      console.log("User ID:", userId);

      if (!userId) {
        console.log("Authentication error: No user ID found");
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      // Check if required data exists before continuing
      if (!req.body) {
        console.log("Error: Request body is undefined or null");
        res.status(400).json({
          status: "error",
          message: "Request body is missing",
          details: { body: req.body },
        });
        return;
      }

      if (!req.body.items || !Array.isArray(req.body.items)) {
        console.log(
          "Error: Items array is missing or not an array",
          req.body.items
        );
        res.status(400).json({
          status: "error",
          message: "Items array is required and must be an array",
          details: { items: req.body.items },
        });
        return;
      }

      if (!req.body.dueDate) {
        console.log("Error: Due date is missing", req.body.dueDate);
        res.status(400).json({
          status: "error",
          message: "Due date is required",
          details: { dueDate: req.body.dueDate },
        });
        return;
      }

      console.log("Creating invoice with data:", {
        userId,
        itemsCount: req.body.items.length,
        dueDate: req.body.dueDate,
        notesProvided: !!req.body.notes,
      });

      const invoice = await this.invoiceService.createInvoice({
        userId,
        items: req.body.items,
        dueDate: new Date(req.body.dueDate),
        notes: req.body.notes,
      });

      console.log("Invoice created successfully:", invoice.id);

      res.status(201).json({
        status: "success",
        data: { invoice },
      });
    } catch (error) {
      console.error("Error creating invoice:", error);

      if (error instanceof Error) {
        console.log("Error message:", error.message);
        console.log("Error stack:", error.stack);
      }

      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create invoice",
      });
    }
  };
  public getInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { id } = req.params;
      const invoice = await this.invoiceService.getInvoice(id, userId);

      res.json({
        status: "success",
        data: { invoice },
      });
    } catch (error) {
      res.status(404).json({
        status: "error",
        message: error instanceof Error ? error.message : "Invoice not found",
      });
    }
  };

  public listInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { status, startDate, endDate, page, limit } = req.query;

      const result = await this.invoiceService.listInvoices(userId, {
        status: status as InvoiceStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch invoices",
      });
    }
  };

  public updateInvoiceStatus = async (
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

      const { id } = req.params;
      const { status } = req.body;

      const invoice = await this.invoiceService.updateInvoiceStatus(
        id,
        userId,
        status as InvoiceStatus
      );

      res.json({
        status: "success",
        data: { invoice },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update invoice status",
      });
    }
  };

  public downloadInvoice = async (
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

      const { id } = req.params;
      const filePath = await this.invoiceService.generatePDF(id, userId);

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${id}.pdf`);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      // Clean up after streaming
      fileStream.on("end", () => {
        // Delete the temporary file
        fs.unlink(filePath, err => {
          if (err) console.error("Error deleting temporary file:", err);
        });
      });

      // Handle errors
      fileStream.on("error", error => {
        console.error("Error streaming file:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to download invoice",
        });
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate invoice PDF",
      });
    }
  };

  public sendInvoiceEmail = async (
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

      const { id } = req.params;
      const { email, message } = req.body;

      await this.invoiceService.sendInvoiceByEmail(id, userId, email, message);

      res.json({
        status: "success",
        message: "Invoice sent successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to send invoice",
      });
    }
  };

  public generateRecurringInvoices = async (
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

      const { templateId, frequency, startDate, endDate } = req.body;

      const invoices = await this.invoiceService.createRecurringInvoices({
        userId,
        templateId,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
      });

      res.json({
        status: "success",
        data: { invoices },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate recurring invoices",
      });
    }
  };

  public getInvoiceAnalytics = async (
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

      const { startDate, endDate } = req.query;

      const analytics = await this.invoiceService.getInvoiceAnalytics(userId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        status: "success",
        data: { analytics },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch invoice analytics",
      });
    }
  };
}
