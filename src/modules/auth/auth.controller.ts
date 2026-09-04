import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AuthService } from "./auth.service.js";
import { AppError } from "../../utils/AppError.js";

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUserIntoDB(
    req.body,
    req.ip,
    req.get("user-agent"),
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "User registered successfully",
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUserFromDB(
    req.body,
    req.ip,
    req.get("user-agent"),
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const { idToken, role } = req.body;
  const result = await AuthService.googleLoginIntoDB(
    idToken,
    role,
    req.ip,
    req.get("user-agent"),
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Google authentication successful",
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    throw new AppError(400, "Refresh token is required.");
  }

  const result = await AuthService.refreshAccessToken(token);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Access token refreshed successfully",
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const token = req.body.refreshToken;
  if (!token) {
    throw new AppError(400, "Refresh token is required for logout.");
  }

  const result = await AuthService.logoutUser(token);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged out successfully",
    data: result,
  });
});

export const AuthController = {
  register,
  login,
  googleLogin,
  refreshToken,
  logout,
};
