import { Router } from "express";
import { UserController } from "./user.controller.js";
import { UserValidation } from "./user.validation.js";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";

const router: Router = Router();

router.get(
  "/me",
  auth("PATIENT", "DRIVER", "ADMIN"),
  UserController.getMyProfile,
);

router.patch(
  "/me",
  auth("PATIENT", "DRIVER", "ADMIN"),
  validateRequest(UserValidation.updateProfileValidationSchema),
  UserController.updateMyProfile,
);

router.patch(
  "/me/password",
  auth("PATIENT", "DRIVER", "ADMIN"),
  validateRequest(UserValidation.changePasswordValidationSchema),
  UserController.changePassword,
);

export const UserRoutes: Router = router;
