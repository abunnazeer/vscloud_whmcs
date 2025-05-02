// src/routes/recurring-invoice.routes.ts
import { Router } from "express";
import { RecurringInvoiceController } from "../controllers/recurring-invoice.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import { recurringInvoiceSchema } from "../models/schemas/invoice.schema";

const router = Router();
const recurringController = new RecurringInvoiceController();

// Recurring invoice CRUD routes
router.post(
  "/",
  authenticate,
  // validateRequest(recurringInvoiceSchema),
  recurringController.createRecurringSchedule
);

router.get("/", authenticate, recurringController.listRecurringSchedules);

router.get("/:id", authenticate, recurringController.getRecurringSchedule);

router.patch("/:id", authenticate, recurringController.updateRecurringSchedule);

router.delete(
  "/:id",
  authenticate,
  recurringController.deleteRecurringSchedule
);

// Generation logs
router.get("/:id/logs", authenticate, recurringController.getGenerationLogs);

export default router;
