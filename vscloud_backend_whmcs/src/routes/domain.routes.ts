// src/routes/domain.routes.ts
import { Router } from "express";
import { DomainController } from "../controllers/domain.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  createDomainSchema,
  updateDomainSchema,
  manageDnsRecordsSchema,
  queryDomainsSchema,
} from "../models/schemas/domain.schema";

const router = Router();
const domainController = new DomainController();

// Create a new domain
router.post(
  "/",
  authenticate,
  validateRequest(createDomainSchema),
  domainController.createDomain
);

// Get all domains for the user with filters and pagination
router.get(
  "/",
  authenticate,
  validateRequest(queryDomainsSchema),
  domainController.getUserDomains
);

// Get a specific domain
router.get("/:id", authenticate, domainController.getDomain);

// Update domain settings
router.patch(
  "/:id",
  authenticate,
  validateRequest(updateDomainSchema),
  domainController.updateDomain
);

// Manage DNS records
router.post(
  "/:id/dns",
  authenticate,
  validateRequest(manageDnsRecordsSchema),
  domainController.manageDnsRecords
);

// Delete a domain
router.delete("/:id", authenticate, domainController.deleteDomain);

export default router;
