// src/models/schemas/invoice.schema.ts
import { z } from "zod";

// Base schemas
const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
  type: z.string().min(1, "Type is required"),
  relatedId: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(7.5), // Default VAT rate
});

const invoiceRecipientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

// Main schemas
export const createInvoiceSchema = z.object({
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  dueDate: z.string().datetime("Invalid date format"),
  notes: z.string().optional(),
  recipient: invoiceRecipientSchema.optional(),
  templateId: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PENDING",
    "PAID",
    "OVERDUE",
    "CANCELLED",
    "REFUNDED",
  ]),
  notes: z.string().optional(),
});

export const recurringInvoiceSchema = z.object({
  templateId: z.string(),
  frequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date").optional(),
  recipientId: z.string(),
  autoSend: z.boolean().default(false),
});

export const sendInvoiceEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  message: z.string().optional(),
  includeAttachment: z.boolean().default(true),
  ccEmails: z.array(z.string().email("Invalid CC email address")).optional(),
});

// Invoice template schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  items: z.array(invoiceItemSchema),
  defaultDueDate: z.number().min(1, "Default due days must be positive"),
  defaultNotes: z.string().optional(),
  customFields: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(["text", "number", "date", "boolean"]),
        required: z.boolean().default(false),
        defaultValue: z.string().optional(),
      })
    )
    .optional(),
  isActive: z.boolean().default(true),
});

// Analytics request schema
export const analyticsRequestSchema = z.object({
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date"),
  groupBy: z.enum(["day", "week", "month", "year"]).optional(),
  includeUnpaid: z.boolean().default(true),
});

// Reminder settings schema
export const reminderSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  beforeDueDays: z.array(z.number()).default([7, 3, 1]),
  afterDueDays: z.array(z.number()).default([1, 3, 7, 14]),
  includeAttachment: z.boolean().default(true),
  customMessage: z.string().optional(),
});

// Export types
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type RecurringInvoiceInput = z.infer<typeof recurringInvoiceSchema>;
export type SendInvoiceEmailInput = z.infer<typeof sendInvoiceEmailSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type AnalyticsRequestInput = z.infer<typeof analyticsRequestSchema>;
export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;
