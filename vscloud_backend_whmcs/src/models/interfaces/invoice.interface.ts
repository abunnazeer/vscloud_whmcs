// src/models/interfaces/invoice.interface.ts
import { InvoiceStatus } from "@prisma/client";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  type: string;
  relatedId?: string;
}

export interface InvoiceData {
  userId: string;
  items: InvoiceItem[];
  dueDate: Date;
  notes?: string;
  templateId?: string;
  recipientId?: string;
}

export interface InvoiceFilter {
  status?: InvoiceStatus;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface TemplateItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  type: string;
}

export interface TemplateData {
  name: string;
  description?: string;
  items: TemplateItem[];
  notes?: string;
  isActive?: boolean;
  paymentTerms?: number;
}

export interface TemplateFilter {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RecurringInvoiceData {
  userId: string;
  templateId: string;
  frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  startDate: Date;
  endDate?: Date;
  recipientId: string;
  autoSend: boolean;
  amount?: number;
  description?: string;
}

export interface RecurringInvoiceFilter {
  status?: "ACTIVE" | "PAUSED" | "CANCELLED";
  recipientId?: string;
  page?: number;
  limit?: number;
}

export interface ReminderSettings {
  enabled: boolean;
  beforeDueDays: number[];
  afterDueDays: number[];
  includeAttachment: boolean;
  customMessage?: string;
}

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  groupBy?: "day" | "week" | "month" | "year";
  includeUnpaid?: boolean;
}

export interface ReportParams {
  startDate: Date;
  endDate: Date;
  format: "pdf" | "csv" | "excel";
}

export interface ForecastParams {
  months: number;
}
