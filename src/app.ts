import cors from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import router from "./routes/index.js";
import { SwaggerRoutes } from "./docs/swagger.route.js";

const app: Application = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

// Capture raw body buffer for Stripe webhook verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
    errors: [],
  },
});
app.use("/api/", limiter);

// Interactive Swagger Documentation
app.use("/", SwaggerRoutes);
app.use("/api", SwaggerRoutes);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to ResQPatient Backend API 🚑",
    documentation: "/docs",
    openapi: "/docs.json",
    health: "/api/v1/health",
  });
});

// Centralized API v1 routes
app.use("/api/v1", router);

// Error handlers
app.use(notFound);
app.use(globalErrorHandler);

export default app;
