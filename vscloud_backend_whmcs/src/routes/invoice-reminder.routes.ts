// src/routes/invoice-reminder.routes.ts
import { Router } from "express";
import { InvoiceReminderController } from "../controllers/invoice-reminder.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  reminderSettingsSchema,
  manualReminderSchema,
} from "../models/schemas/invoice.schema";

const router = Router();
const reminderController = new InvoiceReminderController();

// Reminder settings
router.get("/settings", authenticate, reminderController.getSettings);

router.put(
  "/settings",
  authenticate,
  // validateRequest(reminderSettingsSchema),
  reminderController.updateSettings
);

// Manual reminders
router.post(
  "/:invoiceId/send",
  authenticate,
  // validateRequest(manualReminderSchema),
  reminderController.sendManualReminder
);

// Reminder history
router.get(
  "/:invoiceId/history",
  authenticate,
  reminderController.getReminderHistory
);

export default router;
