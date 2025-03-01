// src/types/prisma.types.ts
import { Prisma } from "@prisma/client";

// Get the User type from Prisma's generated types
export type User = Prisma.UserGetPayload<{}>;

// Other useful Prisma types
export type UserWithoutPassword = Omit<User, "password">;

export type SafeUser = Omit<User, "password" | "twoFactorSecret">;

// Type for creating a new user
export type CreateUserInput = Prisma.UserCreateInput;

// Type for updating a user
export type UpdateUserInput = Prisma.UserUpdateInput;

// Type for user where conditions
export type UserWhereInput = Prisma.UserWhereInput;

// Type for user select fields
export type UserSelect = Prisma.UserSelect;
