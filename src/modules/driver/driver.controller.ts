import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { DriverService } from "./driver.service.js";
import { AppError } from "../../utils/AppError.js";

const getMyDriverProfile = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.id;
  if (!driverUserId) {
    throw new AppError(401, "Unauthorized");
  }

  const result = await DriverService.getMyDriverProfileFromDB(driverUserId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver profile retrieved successfully",
    data: result,
  });
});

const updateDriverProfile = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.id;
  if (!driverUserId) {
    throw new AppError(401, "Unauthorized");
  }

  const result = await DriverService.updateDriverProfileIntoDB(
    driverUserId,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver profile updated successfully",
    data: result,
  });
});

const toggleAvailability = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.id;
  if (!driverUserId) {
    throw new AppError(401, "Unauthorized");
  }

  const result = await DriverService.toggleAvailabilityIntoDB(
    driverUserId,
    req.body.isAvailable,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: { isAvailable: result.isAvailable },
  });
});

const getMyTrips = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.id;
  if (!driverUserId) {
    throw new AppError(401, "Unauthorized");
  }

  const result = await DriverService.getDriverTripsFromDB(driverUserId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver trips retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const DriverController = {
  getMyDriverProfile,
  updateDriverProfile,
  toggleAvailability,
  getMyTrips,
};
