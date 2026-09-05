import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AmbulanceService } from "./ambulance.service.js";
import { AppError } from "../../utils/AppError.js";

const getParamId = (req: Request): string => {
  const id = req.params.id;
  if (!id) throw new AppError(400, "Ambulance ID is required.");
  return Array.isArray(id) ? id[0]! : id;
};

const createAmbulance = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbulanceService.createAmbulanceIntoDB(req.body, req.user?.id);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Ambulance registered successfully",
    data: result,
  });
});

const getAllAmbulances = catchAsync(async (req: Request, res: Response) => {
  const result = await AmbulanceService.getAllAmbulancesFromDB(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Ambulances fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAmbulanceById = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const result = await AmbulanceService.getAmbulanceByIdFromDB(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Ambulance details retrieved successfully",
    data: result,
  });
});

const updateAmbulance = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const result = await AmbulanceService.updateAmbulanceIntoDB(id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Ambulance updated successfully",
    data: result,
  });
});

const deleteAmbulance = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const result = await AmbulanceService.deleteAmbulanceFromDB(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const result = await AmbulanceService.updateAmbulanceStatusIntoDB(id, req.body.status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Ambulance status updated successfully",
    data: result,
  });
});

const updateLocation = catchAsync(async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const idOrDriverId = rawId ? (Array.isArray(rawId) ? rawId[0]! : rawId) : req.user?.id;
  if (!idOrDriverId) {
    throw new AppError(401, "Unauthorized! Identification missing.");
  }
  const result = await AmbulanceService.updateAmbulanceLocationIntoDB(
    idOrDriverId,
    req.body,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Ambulance location updated successfully",
    data: result,
  });
});

export const AmbulanceController = {
  createAmbulance,
  getAllAmbulances,
  getAmbulanceById,
  updateAmbulance,
  deleteAmbulance,
  updateStatus,
  updateLocation,
};
