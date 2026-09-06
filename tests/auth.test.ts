import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Authentication & RBAC Tests", () => {
  const timestamp = Date.now();
  const testPatient = {
    name: "Test Patient",
    email: `testpatient_${timestamp}@example.com`,
    password: "Password@123",
    phone: "+1-555-9999",
    role: "PATIENT" as const,
  };

  it("POST /api/v1/auth/register - should register a new patient successfully", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(testPatient);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.email).toBe(testPatient.email);
    expect(res.body.data.role).toBe("PATIENT");
    expect(res.body.data).not.toHaveProperty("password");
  });

  it("POST /api/v1/auth/register - should block public registration with ADMIN role", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Hacker",
        email: `hacker_${timestamp}@example.com`,
        password: "Password@123",
        role: "ADMIN",
      });

    expect(res.status).toBe(400); // Caught by Zod validation enum ["PATIENT", "DRIVER"]
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/auth/register - should reject duplicate email registration", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(testPatient);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/auth/login - should fail with wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testPatient.email,
        password: "WrongPassword!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/auth/login - should log in successfully and return JWT + refresh token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testPatient.email,
        password: testPatient.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");
    expect(res.body.data.user.email).toBe(testPatient.email);
  });

  it("POST /api/v1/auth/refresh-token - should rotate access token and refresh token", async () => {
    // 1. Log in to get tokens
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testPatient.email,
        password: testPatient.password,
      });

    const oldRefreshToken = loginRes.body.data.refreshToken;

    // 2. Rotate token
    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: oldRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data).toHaveProperty("accessToken");
    expect(refreshRes.body.data).toHaveProperty("refreshToken");

    // 3. Old refresh token should be revoked and cannot be reused
    const secondRefreshRes = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: oldRefreshToken });

    expect(secondRefreshRes.status).toBe(401);
  });

  it("POST /api/v1/auth/logout - should revoke refresh token", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testPatient.email,
        password: testPatient.password,
      });

    const token = loginRes.body.data.refreshToken;

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: token });

    expect(logoutRes.status).toBe(200);

    // Now refresh token should fail
    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: token });

    expect(refreshRes.status).toBe(401);
  });
});
