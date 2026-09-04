import { z } from "zod";

const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
    role: z.enum(["PATIENT", "DRIVER"] as const).optional(),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
});

const googleLoginValidationSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, "Google ID token is required"),
    role: z.enum(["PATIENT", "DRIVER"] as const).optional(),
  }),
});

const refreshTokenValidationSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  googleLoginValidationSchema,
  refreshTokenValidationSchema,
};
