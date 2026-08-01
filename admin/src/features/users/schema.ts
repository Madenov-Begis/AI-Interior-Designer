import { z } from "zod";

export const creditAdjustmentSchema = z.object({
  amount: z
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine((value) => value !== 0, "Введите ненулевое количество кредитов"),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.uuid(),
});

export type CreditAdjustmentInput = z.infer<typeof creditAdjustmentSchema>;
