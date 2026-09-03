import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: any[] = [];

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    errors = err.issues.map((issue) => ({
      field: issue.path.slice(1).join(".") || issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors.length > 0 ? err.errors : [{ message: err.message }];
  } else if (err?.code === "23505") {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    message = "A record with this information already exists.";
    errors = [{ message: err.detail || err.message }];
  } else if (err instanceof Error) {
    message = err.message;
    statusCode = (err as any).statusCode || 500;
    errors = [{ message: err.message }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

export default globalErrorHandler;
