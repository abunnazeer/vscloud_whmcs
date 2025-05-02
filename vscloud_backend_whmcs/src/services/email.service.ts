// src/services/email.service.ts
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter with Mailtrap config
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // connectionTimeout: 10000, // Increase timeout to 10 seconds
      // greetingTimeout: 10000,
      debug: process.env.NODE_ENV === "development", // Enable debug logs in development
      logger: process.env.NODE_ENV === "development", // Enable logger in development
    });

    // Verify connection configuration
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("✉️ Email service is ready");
    } catch (error) {
      console.error("Email service configuration error:", error);
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    try {
      const info = await this.transporter.sendMail({
        from: `"VSCloud" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: "Verify your email address",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Email Verification</h1>
            <p>Thank you for registering! Please click the button below to verify your email address:</p>
            <a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Verify Email</a>
            <p>Or copy and paste this link in your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
        `,
      });

      console.log("Verification email sent:", info.messageId);
    } catch (error) {
      console.error("Failed to send verification email:", error);
      throw new Error("Failed to send verification email");
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    try {
      const info = await this.transporter.sendMail({
        from: `"VSCloud" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: "Reset your password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Password Reset</h1>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
            <p>Or copy and paste this link in your browser:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
          </div>
        `,
      });

      console.log("Password reset email sent:", info.messageId);
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  async sendReminderEmail(options: {
    to: string;
    subject: string;
    message: string;
    attachmentPath?: string;
  }): Promise<void> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"VSCloud" <${process.env.SMTP_FROM}>`,
        to: options.to,
        subject: options.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Invoice Reminder</h1>
            <div style="margin: 16px 0;">
              ${options.message.replace(/\n/g, "<br>")}
            </div>
            <p>If you've already made the payment, please disregard this reminder.</p>
            <p>For any questions, please contact our support team.</p>
          </div>
        `,
      };

      // Add attachment if provided
      if (options.attachmentPath && fs.existsSync(options.attachmentPath)) {
        mailOptions.attachments = [
          {
            filename: path.basename(options.attachmentPath),
            path: options.attachmentPath,
          },
        ];
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Reminder email sent:", info.messageId);
    } catch (error) {
      console.error("Failed to send reminder email:", error);
      throw new Error("Failed to send reminder email");
    }
  }

  async sendInvoiceEmail(options: {
    to: string;
    invoiceId: string;
    template: string;
    message?: string;
    attachmentPath?: string;
  }): Promise<void> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"VSCloud" <${process.env.SMTP_FROM}>`,
        to: options.to,
        subject: `Invoice ${options.invoiceId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Your Invoice</h1>
            <p>Please find attached the invoice for our services.</p>
            ${options.message ? `<p>${options.message}</p>` : ""}
            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            <p>Thank you for your business!</p>
          </div>
        `,
      };

      // Add attachment if provided
      if (options.attachmentPath && fs.existsSync(options.attachmentPath)) {
        mailOptions.attachments = [
          {
            filename: path.basename(options.attachmentPath),
            path: options.attachmentPath,
          },
        ];
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Invoice email sent:", info.messageId);
    } catch (error) {
      console.error("Failed to send invoice email:", error);
      throw new Error("Failed to send invoice email");
    }
  }
}
