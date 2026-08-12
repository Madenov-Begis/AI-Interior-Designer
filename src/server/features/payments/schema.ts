import { z } from "zod";

export const paymentOrderCreateSchema = z.object({
  packageCode: z.string().trim().min(2).max(32).regex(/^[a-z0-9-]+$/),
});

export const paymentOrderIdSchema = z.uuid();

export const mockOutcomeSchema = z.object({
  outcome: z.enum(["PAID", "FAILED", "CANCELLED"]),
});
