import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { EmergencyService } from "./emergency.service.js";
import { AppError } from "../../utils/AppError.js";

const getParamId = (req: Request): string => {
  const id = req.params.id;
  if (!id) throw new AppError(400, "Emergency ID is required.");
  return Array.isArray(id) ? id[0]! : id;
};

const createEmergency = catchAsync(async (req: Request, res: Response) => {
  const patientUserId = req.user?.id;
  if (!patientUserId) {
    throw new AppError(401, "Unauthorized");
  }

  const result = await EmergencyService.createEmergencyIntoDB(
    patientUserId,
    req.body,
    req.ip,
    req.get("user-agent"),
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Emergency request registered successfully",
    data: result,
  });
});

const cancelEmergency = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const user = req.user;
  if (!user) throw new AppError(401, "Unauthorized");

  const result = await EmergencyService.cancelEmergencyIntoDB(
    id,
    user,
    req.body?.reason,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Emergency cancelled successfully",
    data: result,
  });
});

const getMyEmergencies = catchAsync(async (req: Request, res: Response) => {
  const patientUserId = req.user?.id;
  if (!patientUserId) throw new AppError(401, "Unauthorized");

  const result = await EmergencyService.getMyEmergenciesFromDB(
    patientUserId,
    req.query,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Patient emergencies retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getEmergencyById = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const user = req.user;
  if (!user) throw new AppError(401, "Unauthorized");

  const result = await EmergencyService.getEmergencyByIdFromDB(id, user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Emergency details retrieved successfully",
    data: result,
  });
});

const getAllEmergencies = catchAsync(async (req: Request, res: Response) => {
  const result = await EmergencyService.getAllEmergenciesFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Emergencies retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const EmergencyController = {
  createEmergency,
  cancelEmergency,
  getMyEmergencies,
  getEmergencyById,
  getAllEmergencies,
};
