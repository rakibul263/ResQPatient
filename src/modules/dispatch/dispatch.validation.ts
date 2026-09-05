import { z } from "zod";

const updateStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum([
      "ACCEPTED",
      "EN_ROUTE",
      "ARRIVED",
      "PICKED_UP",
      "AT_HOSPITAL",
      "COMPLETED",
    ] as const),
  }),
});

const rejectDispatchValidationSchema = z.object({
  body: z.object({
    reason: z.string().min(1, "Rejection reason is required").optional(),
  }),
});

export const DispatchValidation = {
  updateStatusValidationSchema,
  rejectDispatchValidationSchema,
};
