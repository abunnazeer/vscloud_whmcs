// src/routes/invoice-analytics.routes.ts
import { Router } from "express";
import { InvoiceAnalyticsController } from "../controllers/invoice-analytics.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const analyticsController = new InvoiceAnalyticsController();

// Analytics endpoints
router.get("/", authenticate, analyticsController.getAnalytics);

router.get("/aging-report", authenticate, analyticsController.getAgingReport);

router.post(
  "/generate-report",
  authenticate,
  analyticsController.generateReport
);

router.get("/forecast", authenticate, analyticsController.getRevenueForecast);

router.get(
  "/client/:clientId",
  authenticate,
  analyticsController.getClientAnalytics
);

export default router;
