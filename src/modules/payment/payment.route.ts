import { Router } from "express";
import { PaymentController } from "./payment.controller.js";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { PaymentValidation } from "./payment.validation.js";

const router: Router = Router();

router.post(
  "/initiate",
  auth("PATIENT"),
  validateRequest(PaymentValidation.initiatePaymentValidationSchema),
  PaymentController.initiatePayment,
);

router.get(
  "/my",
  auth("PATIENT"),
  PaymentController.getMyPayments,
);

router.get(
  "/:id",
  auth("PATIENT", "ADMIN"),
  PaymentController.getPaymentById,
);

router.post(
  "/webhook",
  PaymentController.handleWebhook,
);

export const PaymentRoutes: Router = router;
