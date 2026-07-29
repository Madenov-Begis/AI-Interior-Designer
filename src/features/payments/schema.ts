import { z } from "zod";

export const paymentOrderCreateSchema = z.object({
  packageCode: z.enum(["mini", "standard", "pro"]),
});

export const paymentOrderIdSchema = z.uuid();

export const mockOutcomeSchema = z.object({
  outcome: z.enum(["PAID", "FAILED", "CANCELLED"]),
});
