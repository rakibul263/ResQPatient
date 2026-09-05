import { Router } from "express";
import { DispatchController } from "./dispatch.controller.js";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { DispatchValidation } from "./dispatch.validation.js";

const router: Router = Router();

router.get(
  "/my",
  auth("DRIVER"),
  DispatchController.getMyDispatches,
);

router.get(
  "/:id",
  auth("PATIENT", "DRIVER", "ADMIN"),
  DispatchController.getDispatchById,
);

router.post(
  "/:id/accept",
  auth("DRIVER"),
  DispatchController.acceptDispatch,
);

router.post(
  "/:id/reject",
  auth("DRIVER"),
  validateRequest(DispatchValidation.rejectDispatchValidationSchema),
  DispatchController.rejectDispatch,
);

router.patch(
  "/:id/status",
  auth("DRIVER"),
  validateRequest(DispatchValidation.updateStatusValidationSchema),
  DispatchController.updateStatus,
);

export const DispatchRoutes: Router = router;
