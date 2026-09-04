import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { AuthValidation } from "./auth.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";

const router: Router = Router();

router.post(
  "/register",
  validateRequest(AuthValidation.registerValidationSchema),
  AuthController.register,
);

router.post(
  "/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login,
);

router.post(
  "/google",
  validateRequest(AuthValidation.googleLoginValidationSchema),
  AuthController.googleLogin,
);

router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthController.refreshToken,
);

router.post(
  "/logout",
  AuthController.logout,
);

export const AuthRoutes: Router = router;
