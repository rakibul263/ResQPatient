import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Strict RBAC Authorization Tests", () => {
  let patientToken: string;
  let driverToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // 1. Admin login
    const adminRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "admin@resqpatient.com",
        password: "Admin@12345",
      });
    adminToken = adminRes.body.data.accessToken;

    // 2. Patient login
    const patientRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "patient1@resqpatient.com",
        password: "Patient@12345",
      });
    patientToken = patientRes.body.data.accessToken;

    // 3. Driver login
    const driverRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "driver1@resqpatient.com",
        password: "Driver@12345",
      });
    driverToken = driverRes.body.data.accessToken;
  });

  it("should reject unauthenticated request with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should prevent PATIENT from accessing ADMIN endpoints with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should prevent DRIVER from accessing ADMIN endpoints with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/admin/statistics")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should allow ADMIN to access ADMIN endpoints", async () => {
    const res = await request(app)
      .get("/api/v1/admin/statistics")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("users");
  });

  it("should prevent PATIENT from accessing DRIVER trips endpoint with 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/drivers/me/trips")
      .set("Authorization", `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should allow DRIVER to access DRIVER trips endpoint", async () => {
    const res = await request(app)
      .get("/api/v1/drivers/me/trips")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
