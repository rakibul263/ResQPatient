import { Router } from "express";
import { EmergencyController } from "./emergency.controller.js";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { EmergencyValidation } from "./emergency.validation.js";

const router: Router = Router();

router.post(
  "/",
  auth("PATIENT"),
  validateRequest(EmergencyValidation.createEmergencyValidationSchema),
  EmergencyController.createEmergency,
);

router.get(
  "/",
  auth("ADMIN"),
  EmergencyController.getAllEmergencies,
);

router.get(
  "/my",
  auth("PATIENT"),
  EmergencyController.getMyEmergencies,
);

router.get(
  "/:id",
  auth("PATIENT", "DRIVER", "ADMIN"),
  EmergencyController.getEmergencyById,
);

router.patch(
  "/:id/cancel",
  auth("PATIENT", "ADMIN"),
  validateRequest(EmergencyValidation.cancelEmergencyValidationSchema),
  EmergencyController.cancelEmergency,
);

export const EmergencyRoutes: Router = router;
