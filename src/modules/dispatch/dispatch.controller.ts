import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { DispatchService } from "./dispatch.service.js";
import { AppError } from "../../utils/AppError.js";

const getParamId = (req: Request): string => {
  const id = req.params.id;
  if (!id) throw new AppError(400, "Dispatch ID is required.");
  return Array.isArray(id) ? id[0]! : id;
};

const getMyDispatches = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.id;
  if (!driverUserId) throw new AppError(401, "Unauthorized");

  const result = await DispatchService.getMyDispatchesFromDB(
    driverUserId,
    req.query,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver dispatches retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getDispatchById = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const user = req.user;
  if (!user) throw new AppError(401, "Unauthorized");

  const result = await DispatchService.getDispatchByIdFromDB(id, user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dispatch details retrieved successfully",
    data: result,
  });
});

const acceptDispatch = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const driverUserId = req.user?.id;
  if (!driverUserId) throw new AppError(401, "Unauthorized");

  const result = await DispatchService.acceptDispatchIntoDB(id, driverUserId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dispatch accepted successfully",
    data: result,
  });
});

const rejectDispatch = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const driverUserId = req.user?.id;
  if (!driverUserId) throw new AppError(401, "Unauthorized");

  const result = await DispatchService.rejectDispatchIntoDB(
    id,
    driverUserId,
    req.body?.reason,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dispatch rejected successfully",
    data: result,
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const driverUserId = req.user?.id;
  if (!driverUserId) throw new AppError(401, "Unauthorized");

  const result = await DispatchService.updateDispatchStatusIntoDB(
    id,
    driverUserId,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Dispatch status progressed to '${req.body.status}'`,
    data: result,
  });
});

export const DispatchController = {
  getMyDispatches,
  getDispatchById,
  acceptDispatch,
  rejectDispatch,
  updateStatus,
};
