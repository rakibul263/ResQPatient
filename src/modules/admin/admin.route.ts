import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { AdminValidation } from "./admin.validation.js";

const router: Router = Router();

// All routes here strictly require ADMIN role
router.use(auth("ADMIN"));

router.get("/users", AdminController.getUsers);

router.patch(
  "/users/:id/status",
  validateRequest(AdminValidation.updateUserStatusValidationSchema),
  AdminController.updateUserStatus,
);

router.patch(
  "/users/:id/role",
  validateRequest(AdminValidation.updateUserRoleValidationSchema),
  AdminController.updateUserRole,
);

router.get("/statistics", AdminController.getStatistics);

router.get("/audit-logs", AdminController.getAuditLogs);

router.get("/emergencies", AdminController.getAllEmergencies);

router.get("/payments", AdminController.getAllPayments);

export const AdminRoutes: Router = router;
