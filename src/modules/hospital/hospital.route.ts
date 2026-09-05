import { Router } from "express";
import { HospitalController } from "./hospital.controller.js";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { HospitalValidation } from "./hospital.validation.js";

const router: Router = Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(HospitalValidation.createHospitalValidationSchema),
  HospitalController.createHospital,
);

router.get(
  "/",
  auth("PATIENT", "DRIVER", "ADMIN"),
  HospitalController.getAllHospitals,
);

router.get(
  "/search",
  auth("PATIENT", "DRIVER", "ADMIN"),
  validateRequest(HospitalValidation.searchHospitalValidationSchema),
  HospitalController.searchHospitals,
);

router.get(
  "/:id",
  auth("PATIENT", "DRIVER", "ADMIN"),
  HospitalController.getHospitalById,
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(HospitalValidation.updateHospitalValidationSchema),
  HospitalController.updateHospital,
);

router.delete(
  "/:id",
  auth("ADMIN"),
  HospitalController.deleteHospital,
);

export const HospitalRoutes: Router = router;
