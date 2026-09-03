import type { NextFunction, Request, Response } from "express";

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: "API Not Found!",
    errors: [
      { path: req.originalUrl, message: "The requested route does not exist." },
    ],
  });
};
