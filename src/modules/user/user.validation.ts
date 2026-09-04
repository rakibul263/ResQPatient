import { z } from "zod";

const updateProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    phone: z.string().optional(),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  }),
});

export const UserValidation = {
  updateProfileValidationSchema,
  changePasswordValidationSchema,
};
