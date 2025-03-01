// src/routes/invoice.routes.ts
import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  recurringInvoiceSchema,
  sendInvoiceEmailSchema,
} from "../models/schemas/invoice.schema";

const router = Router();
const invoiceController = new InvoiceController();

// Invoice CRUD routes
router.post(
  "/",
  authenticate,
  validateRequest(createInvoiceSchema),
  invoiceController.createInvoice
);

router.get("/", authenticate, invoiceController.listInvoices);

router.get("/:id", authenticate, invoiceController.getInvoice);

router.patch(
  "/:id/status",
  authenticate,
  validateRequest(updateInvoiceSchema),
  invoiceController.updateInvoiceStatus
);

// Invoice download and sending
router.get("/:id/download", authenticate, invoiceController.downloadInvoice);

router.post(
  "/:id/send",
  authenticate,
  validateRequest(sendInvoiceEmailSchema),
  invoiceController.sendInvoiceEmail
);

// Recurring invoices
router.post(
  "/recurring",
  authenticate,
  validateRequest(recurringInvoiceSchema),
  invoiceController.generateRecurringInvoices
);

// Analytics
router.get("/analytics", authenticate, invoiceController.getInvoiceAnalytics);

export default router;
