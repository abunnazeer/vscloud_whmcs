// src/controllers/billing.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { BillingService } from "../services/billing.service";
import { PaystackService } from "../integrations/paystack/paystack.service";

export class BillingController {
  private billingService: BillingService;
  private paystackService: PaystackService;

  constructor() {
    this.billingService = new BillingService();
    this.paystackService = new PaystackService();
  }

  public createInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("Create invoice request:", req.body);

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      if (
        !req.body ||
        !req.body.items ||
        !Array.isArray(req.body.items) ||
        req.body.items.length === 0
      ) {
        res.status(400).json({
          status: "error",
          message: "Invoice items are required",
        });
        return;
      }

      if (!req.body.dueDate) {
        res.status(400).json({
          status: "error",
          message: "Due date is required",
        });
        return;
      }

      const invoice = await this.billingService.createInvoice({
        userId,
        items: req.body.items,
        dueDate: new Date(req.body.dueDate),
        notes: req.body.notes,
        recipientId: req.body.recipientId,
      });

      res.status(201).json({
        status: "success",
        data: { invoice },
      });
    } catch (error) {
      console.error("Error in createInvoice:", error);
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
      const invoice = await this.billingService.getInvoiceById(id, userId);

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

  public initializePayment = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userEmail = req.user?.email;

      if (!userId || !userEmail) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { invoiceId } = req.body;

      if (!invoiceId) {
        res.status(400).json({
          status: "error",
          message: "Invoice ID is required",
        });
        return;
      }

      const callbackUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/payment/verify`;

      const paymentData = await this.billingService.initializePayment({
        userId,
        invoiceId,
        email: userEmail,
        callbackUrl,
      });

      res.json({
        status: "success",
        data: paymentData,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to initialize payment",
      });
    }
  };

  public verifyPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reference } = req.query;

      if (!reference || typeof reference !== "string") {
        res.status(400).json({
          status: "error",
          message: "Payment reference is required",
        });
        return;
      }

      const verificationResult = await this.billingService.verifyPayment(
        reference
      );

      res.json({
        status: "success",
        data: verificationResult,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
      });
    }
  };

  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verify webhook signature
      const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
      if (!secretKey) {
        console.error("Missing PAYSTACK_SECRET_KEY environment variable");
        res
          .status(500)
          .json({ status: "error", message: "Server configuration error" });
        return;
      }

      const hash = crypto
        .createHmac("sha512", secretKey)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        res.status(400).json({ status: "error", message: "Invalid signature" });
        return;
      }

      const event = req.body;

      switch (event.event) {
        case "charge.success":
          await this.billingService.verifyPayment(event.data.reference);
          break;

        case "refund.processed":
          // Handle refund processing (implement as needed)
          console.log("Refund processed:", event.data);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.event}`);
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(400).json({
        status: "error",
        message: "Webhook processing failed",
      });
    }
  };

  public getInvoiceHistory = async (
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

      const { status, page, limit } = req.query;

      const history = await this.billingService.getInvoiceHistory(userId, {
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        status: "success",
        data: history,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch invoice history",
      });
    }
  };

  public requestRefund = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      const { paymentId, amount, reason } = req.body;

      if (!paymentId) {
        res.status(400).json({
          status: "error",
          message: "Payment ID is required",
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          status: "error",
          message: "Refund reason is required",
        });
        return;
      }

      const refund = await this.billingService.refundPayment({
        paymentId,
        amount: amount ? Number(amount) : undefined,
        reason,
      });

      res.json({
        status: "success",
        data: { refund },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to process refund",
      });
    }
  };
}
