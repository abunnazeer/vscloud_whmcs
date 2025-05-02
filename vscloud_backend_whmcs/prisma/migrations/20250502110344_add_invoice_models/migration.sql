-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "lastReminderSent" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "paidDate" TIMESTAMP(3),
ADD COLUMN     "recipientId" TEXT,
ADD COLUMN     "remindersSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "InvoiceTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "recipientId" TEXT NOT NULL,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "amount" DOUBLE PRECISION,
    "description" TEXT,
    "nextGenerationDate" TIMESTAMP(3) NOT NULL,
    "lastGenerationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoiceLog" (
    "id" TEXT NOT NULL,
    "recurringInvoiceId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringInvoiceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "beforeDueDays" INTEGER[] DEFAULT ARRAY[1, 3, 7]::INTEGER[],
    "afterDueDays" INTEGER[] DEFAULT ARRAY[1, 3, 7, 14, 30]::INTEGER[],
    "includeAttachment" BOOLEAN NOT NULL DEFAULT true,
    "customMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "daysFromDue" INTEGER NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceTemplate_userId_idx" ON "InvoiceTemplate"("userId");

-- CreateIndex
CREATE INDEX "InvoiceTemplateItem_templateId_idx" ON "InvoiceTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_userId_idx" ON "RecurringInvoice"("userId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_templateId_idx" ON "RecurringInvoice"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringInvoice_id_userId_key" ON "RecurringInvoice"("id", "userId");

-- CreateIndex
CREATE INDEX "RecurringInvoiceLog_recurringInvoiceId_idx" ON "RecurringInvoiceLog"("recurringInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSettings_userId_key" ON "ReminderSettings"("userId");

-- CreateIndex
CREATE INDEX "ReminderLog_invoiceId_idx" ON "ReminderLog"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoiceTemplate" ADD CONSTRAINT "InvoiceTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTemplateItem" ADD CONSTRAINT "InvoiceTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InvoiceTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InvoiceTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceLog" ADD CONSTRAINT "RecurringInvoiceLog_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "RecurringInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSettings" ADD CONSTRAINT "ReminderSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InvoiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
