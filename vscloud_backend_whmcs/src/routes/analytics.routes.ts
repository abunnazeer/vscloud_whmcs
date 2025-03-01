// src/routes/analytics.routes.ts
import { Router } from "express";
import { InvoiceAnalyticsController } from "../controllers/invoice-analytics.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import { analyticsRequestSchema } from "../models/schemas/invoice.schema";

const router = Router();
const analyticsController = new InvoiceAnalyticsController();

// Analytics routes
router.get(
  "/",
  authenticate,
  validateRequest(analyticsRequestSchema),
  analyticsController.getAnalytics
);

router.get("/aging-report", authenticate, analyticsController.getAgingReport);

router.post(
  "/generate-report",
  authenticate,
  analyticsController.generateReport
);

router.get("/forecast", authenticate, analyticsController.getRevenueForecast);

router.get(
  "/clients/:clientId",
  authenticate,
  analyticsController.getClientAnalytics
);

export default router;

// src/routes/reminder.routes.ts
import { Router } from "express";
import { ReminderController } from "../controllers/reminder.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import { reminderSettingsSchema } from "../models/schemas/invoice.schema";

const router = Router();
const reminderController = new ReminderController();

// Reminder settings routes
router.get("/settings", authenticate, reminderController.getReminderSettings);

router.put(
  "/settings",
  authenticate,
  validateRequest(reminderSettingsSchema),
  reminderController.updateReminderSettings
);

// Reminder history and management
router.get(
  "/history/:invoiceId",
  authenticate,
  reminderController.getReminderHistory
);

router.post(
  "/send/:invoiceId",
  authenticate,
  reminderController.sendManualReminder
);

router.post(
  "/schedule/:invoiceId",
  authenticate,
  reminderController.scheduleCustomReminder
);

router.delete(
  "/schedule/:reminderId",
  authenticate,
  reminderController.cancelScheduledReminder
);

export default router;
