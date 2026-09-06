import { Router } from "express";
import { HealthController } from "./health.controller.js";

const router: Router = Router();

router.get("/", HealthController.getHealthStatus);

export const HealthRoutes: Router = router;
