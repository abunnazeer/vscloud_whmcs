// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const authService = new AuthService();

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1]; // Bearer token
    const user = await authService.validateToken(token);

    if (!user) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed" });
  }
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.role !== "ADMIN") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    next();
  } catch (error) {
    res.status(403).json({ message: "Admin access required" });
  }
};
