import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { calculateFare } from "../src/utils/fareCalculator.js";

describe("Payment & Webhook Tests", () => {
  let patientToken: string;
  let driverToken: string;
  let completedEmergencyId: string;

  beforeAll(async () => {
    // 1. Log in patient
    const patientRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "patient2@resqpatient.com",
        password: "Patient@12345",
      });
    patientToken = patientRes.body.data.accessToken;

    // 2. Log in driver
    const driverRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "driver2@resqpatient.com",
        password: "Driver@12345",
      });
    driverToken = driverRes.body.data.accessToken;

    // 3. Get hospital
    const hospitalRes = await request(app)
      .get("/api/v1/hospitals")
      .set("Authorization", `Bearer ${patientToken}`);
    const hospitalId = hospitalRes.body.data[0].id;

    // 4. Create an emergency and step through to COMPLETED
    const emRes = await request(app)
      .post("/api/v1/emergencies")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        hospitalId,
        pickupLocation: "Central Park West, New York, NY",
        pickupLat: 40.785091,
        pickupLng: -73.968285,
        ambulanceType: "OXYGEN",
        urgencyLevel: "CRITICAL",
      });

    completedEmergencyId = emRes.body.data.id;
    const dispatchId = emRes.body.data.dispatch?.id;

    if (dispatchId) {
      // Driver accepts and completes the trip
      await request(app).post(`/api/v1/dispatches/${dispatchId}/accept`).set("Authorization", `Bearer ${driverToken}`);
      await request(app).patch(`/api/v1/dispatches/${dispatchId}/status`).set("Authorization", `Bearer ${driverToken}`).send({ status: "EN_ROUTE" });
      await request(app).patch(`/api/v1/dispatches/${dispatchId}/status`).set("Authorization", `Bearer ${driverToken}`).send({ status: "ARRIVED" });
      await request(app).patch(`/api/v1/dispatches/${dispatchId}/status`).set("Authorization", `Bearer ${driverToken}`).send({ status: "PICKED_UP" });
      await request(app).patch(`/api/v1/dispatches/${dispatchId}/status`).set("Authorization", `Bearer ${driverToken}`).send({ status: "AT_HOSPITAL" });
      await request(app).patch(`/api/v1/dispatches/${dispatchId}/status`).set("Authorization", `Bearer ${driverToken}`).send({ status: "COMPLETED" });
    }
  });

  it("should calculate fare with correct server-side deterministic formula", () => {
    const breakdown = calculateFare(
      40.7128,
      -74.006,
      40.7589,
      -73.9851,
      "ICU",
      "CRITICAL",
    );

    // Base: 50, ICU fee: 80, Critical fee: 40, plus distance
    expect(breakdown.baseFare).toBe(50.0);
    expect(breakdown.ambulanceTypeFee).toBe(80.0);
    expect(breakdown.emergencyFee).toBe(40.0);
    expect(breakdown.distanceKm).toBeGreaterThan(0);
    expect(breakdown.totalFare).toBe(
      Math.round((50 + breakdown.distanceFare + 80 + 40) * 100) / 100,
    );
  });

  let paymentIntentId: string;

  it("POST /api/v1/payments/initiate - should initiate payment for a completed emergency", async () => {
    const res = await request(app)
      .post("/api/v1/payments/initiate")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ emergencyId: completedEmergencyId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("payment");
    expect(res.body.data.payment.status).toBe("PENDING");
    expect(res.body.data.payment.amount).toBeGreaterThan(0);

    paymentIntentId = res.body.data.payment.stripePaymentIntentId;
  });

  it("POST /api/v1/payments/webhook - should idempotently process payment_intent.succeeded webhook", async () => {
    if (!paymentIntentId) return;

    const mockEvent = {
      id: `evt_mock_${Date.now()}`,
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: paymentIntentId,
          status: "succeeded",
          amount_received: 10000,
        },
      },
    };

    // First webhook call: marks as PAID
    const res1 = await request(app)
      .post("/api/v1/payments/webhook")
      .set("stripe-signature", "mock_signature_for_test")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(mockEvent));

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Second webhook call with same event: idempotent handling
    const res2 = await request(app)
      .post("/api/v1/payments/webhook")
      .set("stripe-signature", "mock_signature_for_test")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(mockEvent));

    expect(res2.status).toBe(200);
    expect(res2.body.data.message).toContain("idempotent");
  });
});
