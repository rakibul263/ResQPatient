import { Router } from "express";
import { AmbulanceController } from "./ambulance.controller.js";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { AmbulanceValidation } from "./ambulance.validation.js";

const router: Router = Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(AmbulanceValidation.createAmbulanceValidationSchema),
  AmbulanceController.createAmbulance,
);

router.get(
  "/",
  auth("PATIENT", "DRIVER", "ADMIN"),
  AmbulanceController.getAllAmbulances,
);

router.get(
  "/:id",
  auth("PATIENT", "DRIVER", "ADMIN"),
  AmbulanceController.getAmbulanceById,
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(AmbulanceValidation.updateAmbulanceValidationSchema),
  AmbulanceController.updateAmbulance,
);

router.delete(
  "/:id",
  auth("ADMIN"),
  AmbulanceController.deleteAmbulance,
);

router.patch(
  "/:id/status",
  auth("DRIVER", "ADMIN"),
  validateRequest(AmbulanceValidation.updateStatusValidationSchema),
  AmbulanceController.updateStatus,
);

router.patch(
  "/:id/location",
  auth("DRIVER", "ADMIN"),
  validateRequest(AmbulanceValidation.updateLocationValidationSchema),
  AmbulanceController.updateLocation,
);

// Convenience route for logged-in driver to update location directly
router.patch(
  "/location/me",
  auth("DRIVER"),
  validateRequest(AmbulanceValidation.updateLocationValidationSchema),
  AmbulanceController.updateLocation,
);

export const AmbulanceRoutes: Router = router;
