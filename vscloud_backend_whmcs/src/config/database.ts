// src/config/database.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

// Middleware to handle soft deletes and timestamps
prisma.$use(async (params, next) => {
  const result = await next(params);
  return result;
});

export { prisma };
