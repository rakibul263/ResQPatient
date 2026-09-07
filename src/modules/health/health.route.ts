import { Router } from "express";
import { HealthController } from "./health.controller.js";

const router: Router = Router();

router.get("/", HealthController.getHealthStatus);
router.get("/ping", HealthController.ping);

export const HealthRoutes: Router = router;
