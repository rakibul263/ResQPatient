import { z } from "zod";

const updateUserStatusValidationSchema = z.object({
  body: z.object({
    isSuspended: z.boolean(),
    reason: z.string().optional(),
  }),
});

const updateUserRoleValidationSchema = z.object({
  body: z.object({
    role: z.enum(["PATIENT", "DRIVER", "ADMIN"] as const),
    reason: z.string().optional(),
  }),
});

export const AdminValidation = {
  updateUserStatusValidationSchema,
  updateUserRoleValidationSchema,
};
