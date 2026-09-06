import { z } from "zod";

const initiatePaymentValidationSchema = z.object({
  body: z.object({
    emergencyId: z.string().min(1, "Emergency ID is required"),
  }),
});

export const PaymentValidation = {
  initiatePaymentValidationSchema,
};
