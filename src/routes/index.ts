import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route.js";
import { UserRoutes } from "../modules/user/user.route.js";
import { DriverRoutes } from "../modules/driver/driver.route.js";
import { AmbulanceRoutes } from "../modules/ambulance/ambulance.route.js";
import { HospitalRoutes } from "../modules/hospital/hospital.route.js";
import { EmergencyRoutes } from "../modules/emergency/emergency.route.js";
import { DispatchRoutes } from "../modules/dispatch/dispatch.route.js";
import { PaymentRoutes } from "../modules/payment/payment.route.js";
import { AdminRoutes } from "../modules/admin/admin.route.js";
import { HealthRoutes } from "../modules/health/health.route.js";

const router: Router = Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/drivers",
    route: DriverRoutes,
  },
  {
    path: "/ambulances",
    route: AmbulanceRoutes,
  },
  {
    path: "/hospitals",
    route: HospitalRoutes,
  },
  {
    path: "/emergencies",
    route: EmergencyRoutes,
  },
  {
    path: "/dispatches",
    route: DispatchRoutes,
  },
  {
    path: "/payments",
    route: PaymentRoutes,
  },
  {
    path: "/admin",
    route: AdminRoutes,
  },
  {
    path: "/health",
    route: HealthRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
