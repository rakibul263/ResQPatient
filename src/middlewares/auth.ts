import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { config } from "../config/index.js";
import { db } from "../prisma/db.js";
import type { IAuthUser } from "../types/express.js";

export const auth = (...requiredRoles: Array<"PATIENT" | "DRIVER" | "ADMIN">) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "You are not authorized! No token provided.",
          errors: [{ message: "Authorization token is required in Bearer format" }],
        });
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "You are not authorized! Token is missing.",
          errors: [{ message: "Bearer token format invalid" }],
        });
      }

      const decoded = jwt.verify(
        token,
        config.jwt.secret,
      ) as IAuthUser & JwtPayload;

      // Real-time verification of user status in database
      const user = await db.orm.public.User
        .where((u) => u.id.eq(decoded.id))
        .where((u) => u.deletedAt.isNull())
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User account no longer exists.",
          errors: [{ message: "User account has been deleted" }],
        });
      }

      if (user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: "Account suspended! Access denied.",
          errors: [{ message: "Your account is currently suspended by an administrator." }],
        });
      }

      // Populate req.user with fresh status from DB
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden! You do not have permission to access this resource.",
          errors: [
            {
              message: `Role ${user.role} is not authorized for this endpoint. Required: [${requiredRoles.join(", ")}]`,
            },
          ],
        });
      }

      next();
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token!",
        errors: [{ message: error?.message || "Token verification failed" }],
      });
    }
  };
};

export const requireOwnershipOrAdmin = (
  req: Request,
  resourceOwnerId: string,
): boolean => {
  if (!req.user) return false;
  if (req.user.role === "ADMIN") return true;
  return req.user.id === resourceOwnerId;
};

export default auth;
