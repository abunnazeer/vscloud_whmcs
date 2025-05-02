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
  body: z.object({
    items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
    dueDate: z.string().refine(
      date => {
        // Check if it's a valid ISO date string
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime());
      },
      { message: "Invalid date format" }
    ),
    notes: z.string().optional(),
    recipientId: z.string().optional(),
  }),
});

export const initiatePaymentSchema = z.object({
  body: z.object({
    invoiceId: z.string().min(1, "Invoice ID is required"),
  }),
});

export const refundRequestSchema = z.object({
  body: z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
    amount: z.number().optional(),
    reason: z.string().min(1, "Refund reason is required"),
  }),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>["body"];
export type InitiatePaymentInput = z.infer<
  typeof initiatePaymentSchema
>["body"];
export type RefundRequestInput = z.infer<typeof refundRequestSchema>["body"];
