// src/routes/invoice-template.routes.ts
import { Router } from "express";
import { InvoiceTemplateController } from "../controllers/invoice-template.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  createTemplateSchema,
  updateTemplateSchema,
  duplicateTemplateSchema,
  generateFromTemplateSchema,
} from "../models/schemas/invoice.schema";

const router = Router();
const templateController = new InvoiceTemplateController();

// Template CRUD routes
router.post(
  "/",
  authenticate,
  // validateRequest(createTemplateSchema),
  templateController.createTemplate
);

router.get("/", authenticate, templateController.listTemplates);

router.get("/:id", authenticate, templateController.getTemplate);

router.put(
  "/:id",
  authenticate,
  // validateRequest(updateTemplateSchema),
  templateController.updateTemplate
);

router.delete("/:id", authenticate, templateController.deleteTemplate);

// Additional operations
router.post(
  "/:id/duplicate",
  authenticate,
  // validateRequest(duplicateTemplateSchema),
  templateController.duplicateTemplate
);

router.post(
  "/:templateId/generate",
  authenticate,
  // validateRequest(generateFromTemplateSchema),
  templateController.generateInvoiceFromTemplate
);

export default router;
