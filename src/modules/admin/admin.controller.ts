import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AdminService } from "./admin.service.js";
import { AppError } from "../../utils/AppError.js";

const getParamId = (req: Request): string => {
  const id = req.params.id;
  if (!id) throw new AppError(400, "Target ID is required.");
  return Array.isArray(id) ? id[0]! : id;
};

const getUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getUsersFromDB(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const targetUserId = getParamId(req);
  const adminUserId = req.user?.id;
  if (!adminUserId) throw new AppError(401, "Unauthorized");

  const { isSuspended, reason } = req.body;
  const result = await AdminService.updateUserStatusIntoDB(
    targetUserId,
    isSuspended,
    adminUserId,
    reason,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const targetUserId = getParamId(req);
  const adminUserId = req.user?.id;
  if (!adminUserId) throw new AppError(401, "Unauthorized");

  const { role, reason } = req.body;
  const result = await AdminService.updateUserRoleIntoDB(
    targetUserId,
    role,
    adminUserId,
    reason,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

const getStatistics = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getStatisticsFromDB();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin statistics retrieved successfully",
    data: result,
  });
});

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAuditLogsFromDB(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Audit logs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllEmergencies = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllEmergenciesAdminFromDB(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin emergencies retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllPaymentsAdminFromDB(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const AdminController = {
  getUsers,
  updateUserStatus,
  updateUserRole,
  getStatistics,
  getAuditLogs,
  getAllEmergencies,
  getAllPayments,
};
