import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { PaymentService } from "./payment.service.js";
import { AppError } from "../../utils/AppError.js";

const getParamId = (req: Request): string => {
  const id = req.params.id;
  if (!id) throw new AppError(400, "Payment ID is required.");
  return Array.isArray(id) ? id[0]! : id;
};

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const patientUserId = req.user?.id;
  if (!patientUserId) throw new AppError(401, "Unauthorized");

  const { emergencyId } = req.body;
  const result = await PaymentService.initiatePaymentIntoDB(patientUserId, emergencyId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Payment initiated successfully",
    data: result,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req);
  const user = req.user;
  if (!user) throw new AppError(401, "Unauthorized");

  const result = await PaymentService.getPaymentByIdFromDB(id, user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment details retrieved successfully",
    data: result,
  });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const patientUserId = req.user?.id;
  if (!patientUserId) throw new AppError(401, "Unauthorized");

  const result = await PaymentService.getMyPaymentsFromDB(patientUserId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Patient payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];
  const rawBody = (req as any).rawBody || req.body;

  const result = await PaymentService.handleStripeWebhook(signature, rawBody);

  res.status(200).json({
    success: true,
    message: "Webhook processed successfully",
    data: result,
  });
});

export const PaymentController = {
  initiatePayment,
  getPaymentById,
  getMyPayments,
  handleWebhook,
};
