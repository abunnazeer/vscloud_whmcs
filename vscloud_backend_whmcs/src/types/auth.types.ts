// src/types/auth.types.ts
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  passwordChangeSchema,
  twoFactorSetupSchema,
  twoFactorVerifySchema,
} from "../models/schemas/auth.schema";

// Request types
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type PasswordResetRequestRequest = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetRequest = z.infer<typeof passwordResetSchema>;
export type PasswordChangeRequest = z.infer<typeof passwordChangeSchema>;
export type TwoFactorSetupRequest = z.infer<typeof twoFactorSetupSchema>;
export type TwoFactorVerifyRequest = z.infer<typeof twoFactorVerifySchema>;

// Response types
export interface AuthResponse {
  status: "success" | "error";
  message?: string;
  data?: {
    user?: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      twoFactorEnabled?: boolean;
    };
    token?: string;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Common error response
export interface ErrorResponse {
  status: "error";
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
