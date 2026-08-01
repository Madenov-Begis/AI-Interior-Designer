import { z } from "zod";

export type ApiSuccess<T> = { data: T; meta: { requestId: string } };
export type ApiFailure = { error: { code: string; message: string; details?: unknown }; meta: { requestId: string } };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export const creditAdjustmentSchema = z.object({
  amount: z.number().int().min(-100_000).max(100_000).refine((value) => value !== 0, "Введите ненулевое количество кредитов"),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.uuid(),
});

export const adminLoginSchema = z.object({
  phone: z.string().regex(/^\+998\d{9}$/, "Введите номер в формате +998XXXXXXXXX"),
});

export type CreditAdjustmentInput = z.infer<typeof creditAdjustmentSchema>;
