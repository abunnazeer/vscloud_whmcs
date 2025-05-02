// src/middleware/admin.middleware.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";

export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized - Authentication required",
      });
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Forbidden - Admin access required",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Server error while checking admin privileges",
    });
  }
}
