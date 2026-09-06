import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { db } from "../../prisma/db.js";
import { isRedisOnline } from "../../utils/redis.js";

const getHealthStatus = catchAsync(async (req: Request, res: Response) => {
  let dbStatus = "connected";
  try {
    // Verified query against Prisma 8 ORM
    await db.orm.public.User.limit(1).all();
  } catch (error) {
    dbStatus = "disconnected";
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "ResQPatient API is healthy and operational 🚑",
    data: {
      status: "UP",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      redis: isRedisOnline() ? "connected" : "memory-fallback",
      environment: process.env.NODE_ENV || "development",
    },
  });
});

export const HealthController = {
  getHealthStatus,
};
