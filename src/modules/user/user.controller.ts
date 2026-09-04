import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { UserService } from "./user.service.js";
import { AppError } from "../../utils/AppError.js";

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  const result = await UserService.getMyProfileFromDB(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile fetched successfully",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  const result = await UserService.updateMyProfileIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile updated successfully",
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  const result = await UserService.changePasswordIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

export const UserController = {
  getMyProfile,
  updateMyProfile,
  changePassword,
};
