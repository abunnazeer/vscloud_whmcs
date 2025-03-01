// src/routes/billing.routes.ts
import { Router } from "express";
import { BillingController } from "../controllers/billing.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  createInvoiceSchema,
  initiatePaymentSchema,
  refundRequestSchema,
} from "../models/schemas/billing.schema";

const router = Router();
const billingController = new BillingController();

// Invoice routes
router.post(
  "/invoices",
  authenticate,
  validateRequest(createInvoiceSchema),
  billingController.createInvoice
);

router.get("/invoices", authenticate, billingController.getInvoiceHistory);

// Payment routes
router.post(
  "/payments/initialize",
  authenticate,
  validateRequest(initiatePaymentSchema),
  billingController.initializePayment
);

router.get("/payments/verify", billingController.verifyPayment);

router.post(
  "/payments/refund",
  authenticate,
  validateRequest(refundRequestSchema),
  billingController.requestRefund
);

// Webhook route (no authentication required)
router.post("/webhook", billingController.handleWebhook);

// Credit routes
router.get("/credits", authenticate, billingController.getAvailableCredits);

export default router;
