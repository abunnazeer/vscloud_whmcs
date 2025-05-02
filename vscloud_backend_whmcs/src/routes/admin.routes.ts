// src/routes/admin.routes.ts
import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { isAdmin } from "../middleware/admin.middleware";

const router = Router();

// Apply admin middleware to all routes
router.use(isAdmin);

// Get all domains with filters and pagination
router.get("/domains", AdminController.getAllDomains);

// Get details of a specific domain
router.get("/domains/:domainId", AdminController.getDomainDetails);

// Get registrar statistics
router.get("/stats", AdminController.getRegistrarStats);

export default router;
