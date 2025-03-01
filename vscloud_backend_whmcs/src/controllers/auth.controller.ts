// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { EmailService } from "../services/email.service";
import { ZodError } from "zod";

export class AuthController {
  private authService: AuthService;
  private emailService: EmailService;

  constructor() {
    this.authService = new AuthService();
    this.emailService = new EmailService();
  }

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password } = req.body;
      const result = await this.authService.register(name, email, password);

      res.status(201).json({
        status: "success",
        ...result,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, rememberMe } = req.body;
      const result = await this.authService.login(email, password, rememberMe);

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      res.status(401).json({
        status: "error",
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  };

  public googleLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        res.status(400).json({
          status: "error",
          message: "ID token is required",
        });
        return;
      }

      const result = await this.authService.googleLogin(idToken);
      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      res.status(401).json({
        status: "error",
        message: error instanceof Error ? error.message : "Google login failed",
      });
    }
  };

  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        res.status(400).json({
          status: "error",
          message: "Verification token is required",
        });
        return;
      }

      await this.authService.verifyEmail(token);

      res.json({
        status: "success",
        message: "Email verified successfully. You can now log in.",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Email verification failed",
      });
    }
  };

  public resendVerification = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          status: "error",
          message: "Email is required",
        });
        return;
      }

      const token = await this.authService.createEmailVerificationToken(email);
      if (token) {
        await this.emailService.sendVerificationEmail(email, token);
      }

      res.json({
        status: "success",
        message: "If the email exists, a verification link has been sent",
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to resend verification email",
      });
    }
  };

  public requestPasswordReset = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { email } = req.body;
      const token = await this.authService.createPasswordResetToken(email);

      if (token) {
        await this.emailService.sendPasswordResetEmail(email, token);
      }

      res.json({
        status: "success",
        message: "If the email exists, a password reset link has been sent",
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to process password reset request",
      });
    }
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body;
      await this.authService.resetPassword(token, password);

      res.json({
        status: "success",
        message: "Password reset successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Password reset failed",
      });
    }
  };

  public changePassword = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { currentPassword, newPassword, confirmNewPassword } = req.body;
      const userId = req.user?.id;

      // Check if user is authenticated
      if (!userId) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
        return;
      }

      // Validate passwords match
      if (newPassword !== confirmNewPassword) {
        res.status(400).json({
          status: "error",
          message: "New passwords don't match",
        });
        return;
      }

      // Change password
      await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      res.json({
        status: "success",
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Password change failed",
      });
    }
  };
  public getCurrentUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json({
        status: "success",
        data: { user: req.user },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve user information",
      });
    }
  };
}
