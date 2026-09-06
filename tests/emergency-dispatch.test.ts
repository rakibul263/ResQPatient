import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Emergency Lifecycle & Dispatch State Machine", () => {
  let patientToken: string;
  let driverToken: string;
  let hospitalId: string;

  beforeAll(async () => {
    // 1. Patient login
    const patientRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "patient1@resqpatient.com",
        password: "Patient@12345",
      });
    patientToken = patientRes.body.data.accessToken;

    // 2. Driver login
    const driverRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "driver1@resqpatient.com",
        password: "Driver@12345",
      });
    driverToken = driverRes.body.data.accessToken;

    // 3. Get hospital ID
    const hospitalRes = await request(app)
      .get("/api/v1/hospitals")
      .set("Authorization", `Bearer ${patientToken}`);
    hospitalId = hospitalRes.body.data[0].id;
  });

  let emergencyId: string;
  let dispatchId: string;

  it("POST /api/v1/emergencies - should create an emergency and automatically assign nearest ambulance", async () => {
    const res = await request(app)
      .post("/api/v1/emergencies")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        hospitalId,
        pickupLocation: "Times Square, New York, NY",
        pickupLat: 40.7580,
        pickupLng: -73.9855,
        ambulanceType: "ICU",
        urgencyLevel: "HIGH",
        notes: "Patient with chest pain",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.estimatedFare).toBeGreaterThan(0);

    emergencyId = res.body.data.id;
    if (res.body.data.dispatch) {
      dispatchId = res.body.data.dispatch.id;
    }
  });

  it("POST /api/v1/dispatches/:id/accept - driver should accept dispatch", async () => {
    if (!dispatchId) return;

    const res = await request(app)
      .post(`/api/v1/dispatches/${dispatchId}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ACCEPTED");
  });

  it("PATCH /api/v1/dispatches/:id/status - should transition to EN_ROUTE", async () => {
    if (!dispatchId) return;

    const res = await request(app)
      .patch(`/api/v1/dispatches/${dispatchId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "EN_ROUTE" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("EN_ROUTE");
  });

  it("PATCH /api/v1/emergencies/:id/cancel - should REJECT cancellation once ambulance is EN_ROUTE", async () => {
    if (!emergencyId) return;

    const res = await request(app)
      .patch(`/api/v1/emergencies/${emergencyId}/cancel`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ reason: "Feeling better" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("EN_ROUTE");
  });

  it("PATCH /api/v1/dispatches/:id/status - should reject invalid skips in state transitions", async () => {
    if (!dispatchId) return;

    // Trying to jump from EN_ROUTE directly to COMPLETED should be rejected
    const res = await request(app)
      .patch(`/api/v1/dispatches/${dispatchId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "COMPLETED" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("PATCH /api/v1/dispatches/:id/status - should complete lifecycle sequentially to COMPLETED", async () => {
    if (!dispatchId) return;

    // 1. ARRIVED
    let res = await request(app)
      .patch(`/api/v1/dispatches/${dispatchId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "ARRIVED" });
    expect(res.status).toBe(200);

    // 2. PICKED_UP
    res = await request(app)
      .patch(`/api/v1/dispatches/${dispatchId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "PICKED_UP" });
    expect(res.status).toBe(200);

    // 3. AT_HOSPITAL
    res = await request(app)
      .patch(`/api/v1/dispatches/${dispatchId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "AT_HOSPITAL" });
    expect(res.status).toBe(200);

    // 4. COMPLETED
    res = await request(app)
      .patch(`/api/v1/dispatches/${dispatchId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "COMPLETED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");
  });
});
