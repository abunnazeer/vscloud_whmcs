// src/routes/auth.routes.ts
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  changePasswordSchema,
} from "../models/schemas/auth.schema";

const router = Router();
const authController = new AuthController();

// Public routes
router.post(
  "/register",
  validateRequest(registerSchema),
  authController.register
);

router.post("/login", validateRequest(loginSchema), authController.login);

router.post("/google-login", authController.googleLogin);

// Email verification routes
router.get("/verify-email", authController.verifyEmail);

router.post(
  "/verify-email/resend",
  validateRequest(passwordResetRequestSchema),
  authController.resendVerification
);

// Password reset routes
router.post(
  "/reset-password/request",
  validateRequest(passwordResetRequestSchema),
  authController.requestPasswordReset
);

router.post(
  "/reset-password",
  validateRequest(passwordResetSchema),
  authController.resetPassword
);

// Protected routes
router.get("/me", authenticate, authController.getCurrentUser);

router.post(
  "/change-password",
  authenticate,
  validateRequest(changePasswordSchema),
  authController.changePassword
);

export default router;
