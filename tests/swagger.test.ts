import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Swagger Documentation Endpoints", () => {
  it("GET /docs.json - should serve valid OpenAPI 3.0.3 specification", async () => {
    const res = await request(app).get("/docs.json");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("openapi", "3.0.3");
    expect(res.body).toHaveProperty("info");
    expect(res.body.info.title).toContain("ResQPatient");
    expect(res.body).toHaveProperty("paths");
    expect(res.body.paths).toHaveProperty("/api/v1/auth/login");
    expect(res.body.paths).toHaveProperty("/api/v1/emergencies");
    expect(res.body.paths).toHaveProperty("/api/v1/dispatches/{id}/status");
    expect(res.body.paths).toHaveProperty("/api/v1/payments/webhook");
  });

  it("GET /docs/ - should serve interactive Swagger UI HTML page", async () => {
    const res = await request(app).get("/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
    expect(res.text).toContain("ResQPatient API Docs");
  });

  it("GET / - should provide links to documentation and OpenAPI schema", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.documentation).toBe("/docs");
    expect(res.body.openapi).toBe("/docs.json");
  });
});
