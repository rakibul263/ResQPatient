import { z } from "zod";

const updateDriverProfileValidationSchema = z.object({
  body: z.object({
    licenseNumber: z.string().min(1, "License number cannot be empty").optional(),
    experienceYears: z.number().min(0, "Experience years must be positive").optional(),
  }),
});

const toggleAvailabilityValidationSchema = z.object({
  body: z.object({
    isAvailable: z.boolean(),
  }),
});

export const DriverValidation = {
  updateDriverProfileValidationSchema,
  toggleAvailabilityValidationSchema,
};
