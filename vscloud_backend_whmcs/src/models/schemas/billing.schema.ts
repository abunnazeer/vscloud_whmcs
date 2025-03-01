// src/models/schemas/billing.schema.ts
import { z } from "zod";

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be greater than or equal to 0"),
  type: z.string().min(1, "Type is required"),
  relatedId: z.string().optional(),
});

export const createInvoiceSchema = z.object({
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  dueDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
      "Invalid date format"
    ),
});

export const initiatePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
});

export const refundRequestSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  amount: z.number().optional(),
  reason: z.string().min(1, "Refund reason is required"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
