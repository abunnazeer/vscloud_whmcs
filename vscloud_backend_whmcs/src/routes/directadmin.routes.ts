// src/routes/directadmin.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { DirectAdminController } from "../controllers/directadmin.controller";

const router = Router();
const directAdminController = new DirectAdminController();

// DirectAdmin users routes
router.get("/users", authenticate, directAdminController.fetchUsers);
router.get("/users/:username", authenticate, directAdminController.syncUserAccount);
router.post("/users/:username/suspend", authenticate, directAdminController.suspendUser);
router.post("/users/:username/unsuspend", authenticate, directAdminController.unsuspendUser);
router.delete("/users/:username", authenticate, directAdminController.deleteUser);

export default router;
