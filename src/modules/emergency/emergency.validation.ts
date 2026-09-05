import { z } from "zod";

const createEmergencyValidationSchema = z.object({
  body: z.object({
    hospitalId: z.string().min(1, "Hospital ID is required"),
    pickupLocation: z.string().min(1, "Pickup location description is required"),
    pickupLat: z.number(),
    pickupLng: z.number(),
    ambulanceType: z.enum(["ICU", "OXYGEN", "BASIC"] as const),
    urgencyLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).optional(),
    notes: z.string().optional(),
  }),
});

const cancelEmergencyValidationSchema = z.object({
  body: z.object({
    reason: z.string().min(1, "Cancellation reason is required").optional(),
  }),
});

export const EmergencyValidation = {
  createEmergencyValidationSchema,
  cancelEmergencyValidationSchema,
};
