import { z } from "zod";

const createAmbulanceValidationSchema = z.object({
  body: z.object({
    vehicleNumber: z.string().min(1, "Vehicle number is required"),
    vehicleType: z.enum(["ICU", "OXYGEN", "BASIC"] as const),
    driverId: z.string().min(1, "Driver ID is required").optional(),
    currentLat: z.number().optional(),
    currentLng: z.number().optional(),
  }),
});

const updateAmbulanceValidationSchema = z.object({
  body: z.object({
    vehicleNumber: z.string().min(1).optional(),
    vehicleType: z.enum(["ICU", "OXYGEN", "BASIC"] as const).optional(),
    driverId: z.string().optional().nullable(),
    status: z.enum(["AVAILABLE", "BUSY", "MAINTENANCE"] as const).optional(),
  }),
});

const updateLocationValidationSchema = z.object({
  body: z.object({
    currentLat: z.number(),
    currentLng: z.number(),
  }),
});

const updateStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["AVAILABLE", "BUSY", "MAINTENANCE"] as const),
  }),
});

export const AmbulanceValidation = {
  createAmbulanceValidationSchema,
  updateAmbulanceValidationSchema,
  updateLocationValidationSchema,
  updateStatusValidationSchema,
};
