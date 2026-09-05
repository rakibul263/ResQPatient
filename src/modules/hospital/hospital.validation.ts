import { z } from "zod";

const createHospitalValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Hospital name is required"),
    address: z.string().min(1, "Hospital address is required"),
    contactNumber: z.string().min(1, "Contact number is required"),
    lat: z.number(),
    lng: z.number(),
    capacity: z.number().int().min(1).optional(),
    availableBeds: z.number().int().min(0).optional(),
    isAvailable: z.boolean().optional(),
  }),
});

const updateHospitalValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    contactNumber: z.string().min(1).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    capacity: z.number().int().min(1).optional(),
    availableBeds: z.number().int().min(0).optional(),
    isAvailable: z.boolean().optional(),
  }),
});

const searchHospitalValidationSchema = z.object({
  query: z.object({
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    radiusKm: z.coerce.number().positive().optional(),
    minBeds: z.coerce.number().int().min(0).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional(),
  }),
});

export const HospitalValidation = {
  createHospitalValidationSchema,
  updateHospitalValidationSchema,
  searchHospitalValidationSchema,
};
