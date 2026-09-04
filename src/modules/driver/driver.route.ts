import { Router } from "express";
import { DriverController } from "./driver.controller.js";
import { DriverValidation } from "./driver.validation.js";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";

const router: Router = Router();

router.get(
  "/me",
  auth("DRIVER"),
  DriverController.getMyDriverProfile,
);

router.patch(
  "/me",
  auth("DRIVER"),
  validateRequest(DriverValidation.updateDriverProfileValidationSchema),
  DriverController.updateDriverProfile,
);

router.patch(
  "/me/availability",
  auth("DRIVER"),
  validateRequest(DriverValidation.toggleAvailabilityValidationSchema),
  DriverController.toggleAvailability,
);

router.get(
  "/me/trips",
  auth("DRIVER"),
  DriverController.getMyTrips,
);

export const DriverRoutes: Router = router;
