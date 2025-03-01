// src/services/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/database";
import { EmailService } from "./email.service";

export class AuthService {
  private googleClient: OAuth2Client;
  private emailService: EmailService;

  constructor() {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    this.emailService = new EmailService();
  }

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<{ user: any; message: string }> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: false,
      },
    });

    // Generate verification token
    const verificationToken = await this.createEmailVerificationToken(user.id);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      message:
        "Registration successful. Please check your email to verify your account.",
    };
  }

  async login(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ user: any; token: string }> {
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new Error("Invalid credentials");
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new Error("Please verify your email before logging in");
    }

    // Check lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new Error("Account is temporarily locked. Please try again later.");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Update login attempts
      await this.updateLoginAttempts(user.id, false);
      throw new Error("Invalid credentials");
    }

    // Reset login attempts and update last login
    await this.updateLoginAttempts(user.id, true);

    // Generate token
    const token = this.generateToken(user.id, rememberMe);

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async googleLogin(idToken: string): Promise<{ user: any; token: string }> {
    try {
      // Verify Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error("Invalid Google token");
      }

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        // Create new user if doesn't exist
        const randomPassword = crypto.randomBytes(32).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        user = await prisma.user.create({
          data: {
            name: payload.name || "",
            email: payload.email,
            password: hashedPassword,
            provider: "GOOGLE",
            providerId: payload.sub,
            emailVerified: true,
          },
        });
      }

      // Generate token
      const token = this.generateToken(user.id);

      // Remove sensitive data
      const { password: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token };
    } catch (error) {
      throw new Error("Google authentication failed");
    }
  }

  private async updateLoginAttempts(
    userId: string,
    success: boolean
  ): Promise<void> {
    if (success) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          loginAttempts: 0,
          lastLoginAt: new Date(),
          lockoutUntil: null,
        },
      });
    } else {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          loginAttempts: {
            increment: 1,
          },
        },
      });

      if (user.loginAttempts >= 5) {
        const lockoutUntil = new Date();
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 15);

        await prisma.user.update({
          where: { id: userId },
          data: {
            lockoutUntil,
          },
        });
      }
    }
  }

  async createEmailVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await prisma.emailVerification.create({
      data: {
        userId,
        token,
        expires,
      },
    });

    return token;
  }

  async verifyEmail(token: string): Promise<void> {
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      throw new Error("Invalid verification token");
    }

    if (verification.expires < new Date()) {
      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });
      throw new Error("Verification token has expired");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerification.delete({
        where: { id: verification.id },
      }),
    ]);
  }

  async createPasswordResetToken(email: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expires,
      },
    });

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const reset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!reset || reset.expires < new Date()) {
      throw new Error("Invalid or expired reset token");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.delete({
        where: { id: reset.id },
      }),
    ]);
  }

  async validateToken(token: string): Promise<any | null> {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      ) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) return null;

      // Remove sensitive data
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      return null;
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.password) {
        throw new Error("User not found or invalid authentication method");
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isValidPassword) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Password change error:", error);
      throw error;
    }
  }
  private generateToken(userId: string, rememberMe: boolean = false): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: rememberMe ? "30d" : "24h",
    });
  }
}
