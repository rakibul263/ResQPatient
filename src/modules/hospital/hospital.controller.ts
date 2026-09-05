import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { HospitalService } from "./hospital.service.js";
import { AppError } from "../../utils/AppError.js";

const getParamId = (req: Request): string => {
  const id = req.params.id;
  if (!id) throw new AppError(400, "Hospital ID is required.");
  return Array.isArray(id) ? id[0]! : id;
};

const createHospital = catchAsync(async (req: Request, res: Response) => {
  const result = await HospitalService.createHospitalIntoDB(req.body, req.user?.id);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Hospital created successfully",
    data: result,
  });
});

const getAllHospitals = catchAsync(async (req: Request, res: Response) => {
  const result = await HospitalService.getAllHospitalsFromDB(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Hospitals fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const searchHospitals = catchAsync(async (req: Request, res: Response) => {
  const result = await HospitalService.searchHospitalsFromDB(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Hospitals found matching criteria",
    meta: result.meta,
    data: result.data,
  });
});

const getHospitalById = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const result = await HospitalService.getHospitalByIdFromDB(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Hospital details retrieved successfully",
    data: result,
  });
});

const updateHospital = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const result = await HospitalService.updateHospitalIntoDB(id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Hospital updated successfully",
    data: result,
  });
});

const deleteHospital = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const result = await HospitalService.deleteHospitalFromDB(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

export const HospitalController = {
  createHospital,
  getAllHospitals,
  searchHospitals,
  getHospitalById,
  updateHospital,
  deleteHospital,
};
