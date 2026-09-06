import { Router, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.definition.js";

const router: Router = Router();

const customCss = `
  .swagger-ui .topbar {
    background-color: #0f172a;
    border-bottom: 2px solid #e11d48;
    padding: 12px 0;
  }
  .swagger-ui .topbar-wrapper img {
    content: url('https://img.icons8.com/color/96/ambulance.png');
    height: 42px;
  }
  .swagger-ui .topbar-wrapper .link {
    font-size: 1.3rem;
    font-weight: 700;
    color: #ffffff !important;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .swagger-ui .info {
    margin: 25px 0;
  }
  .swagger-ui .info .title {
    font-size: 2.2rem;
    color: #0f172a;
    font-weight: 800;
  }
  .swagger-ui .btn.authorize {
    background-color: #e11d48;
    border-color: #e11d48;
    color: #ffffff;
  }
  .swagger-ui .btn.authorize svg {
    fill: #ffffff;
  }
  .swagger-ui .opblock.opblock-post {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }
  .swagger-ui .opblock.opblock-get {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }
  .swagger-ui .opblock.opblock-patch {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.05);
  }
  .swagger-ui .opblock.opblock-delete {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }
`;

const swaggerOptions = {
  explorer: true,
  customSiteTitle: "ResQPatient API Docs 🚑",
  customCss,
  customfavIcon: "https://img.icons8.com/color/48/ambulance.png",
  swaggerOptions: {
    persistAuthorization: true,
    filter: true,
    displayRequestDuration: true,
    docExpansion: "list",
    tryItOutEnabled: true,
  },
};

// Serve Raw OpenAPI JSON
router.get("/docs.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(swaggerSpec);
});

// Serve Interactive Swagger UI
router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

export const SwaggerRoutes = router;
