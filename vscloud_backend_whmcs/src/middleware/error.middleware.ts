// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ErrorResponse } from "../types/auth.types";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
) => {
  console.error(err);

  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
