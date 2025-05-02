// src/models/schemas/invoice.schema.ts
import { z } from "zod";

// Invoice item schema
const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unitPrice: z.number().positive("Unit price must be a positive number"),
  type: z.string().min(1, "Type is required"),
  relatedId: z.string().optional(),
});

// Create invoice schema
// export const createInvoiceSchema = z.object({
//   body: z.object({
//     items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
//     dueDate: z.string().refine(value => !isNaN(Date.parse(value)), {
//       message: "Due date must be a valid date",
//     }),
//     notes: z.string().optional(),
//     recipientId: z.string().optional(),
//   }),
// });



export const createInvoiceSchema = z.object({
  body: z.object({
    // This line is important - validation expects 'body' property
    items: z.array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        type: z.string(),
        relatedId: z.string().optional(),
      })
    ),
    dueDate: z.string(),
    notes: z.string().optional(),
  }),
});

// Update invoice status schema
export const updateInvoiceSchema = z.object({
  body: z.object({
    status: z.enum(["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED"], {
      required_error: "Status is required",
      invalid_type_error: "Status must be a valid invoice status",
    }),
  }),
});

// Send invoice email schema
export const sendInvoiceEmailSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    message: z.string().optional(),
  }),
});

// Recurring invoice schema
export const recurringInvoiceSchema = z.object({
  body: z.object({
    templateId: z.string().uuid("Template ID must be a valid UUID"),
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"], {
      required_error: "Frequency is required",
      invalid_type_error: "Frequency must be daily, weekly, monthly, or yearly",
    }),
    startDate: z.string().refine(value => !isNaN(Date.parse(value)), {
      message: "Start date must be a valid date",
    }),
    endDate: z
      .string()
      .refine(value => !isNaN(Date.parse(value)), {
        message: "End date must be a valid date",
      })
      .optional(),
    recipientId: z.string().optional(),
    autoSend: z.boolean().optional(),
  }),
});

// Invoice template schemas
export const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Template name is required"),
    description: z.string().optional(),
    items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
    paymentTerms: z.number().int().positive().optional(),
  }),
});

export const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Template name is required").optional(),
    description: z.string().optional(),
    items: z
      .array(
        z.object({
          id: z.string().optional(),
          description: z.string().min(1, "Description is required"),
          quantity: z
            .number()
            .int()
            .positive("Quantity must be a positive integer"),
          unitPrice: z
            .number()
            .positive("Unit price must be a positive number"),
          type: z.string().min(1, "Type is required"),
        })
      )
      .optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
    paymentTerms: z.number().int().positive().optional(),
  }),
});

export const duplicateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, "New template name is required"),
  }),
});

export const generateFromTemplateSchema = z.object({
  body: z.object({
    recipientId: z.string().uuid("Recipient ID must be a valid UUID"),
    dueDate: z.string().refine(value => !isNaN(Date.parse(value)), {
      message: "Due date must be a valid date",
    }),
    adjustments: z
      .array(
        z.object({
          itemId: z.string().uuid("Item ID must be a valid UUID"),
          quantity: z.number().int().positive().optional(),
          unitPrice: z.number().positive().optional(),
          description: z.string().optional(),
        })
      )
      .optional(),
    additionalItems: z.array(invoiceItemSchema).optional(),
    notes: z.string().optional(),
  }),
});

// Reminder settings schema
export const reminderSettingsSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
    beforeDueDays: z.array(z.number().int().nonnegative()),
    afterDueDays: z.array(z.number().int().positive()),
    includeAttachment: z.boolean(),
    customMessage: z.string().optional(),
  }),
});

// Manual reminder schema
export const manualReminderSchema = z.object({
  body: z.object({
    message: z.string().optional(),
  }),
});
