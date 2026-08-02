import { z } from "zod";

const nullablePositiveInt = z.number().int().positive().nullable();

export const adminListSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  query: z.string().trim().max(120).optional(),
});
export const updateUserSchema = z
  .object({
    role: z.enum(["USER", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "BLOCKED", "DELETED"]).optional(),
    planId: z.uuid().nullable().optional(),
    maxParallelOverride: nullablePositiveInt.optional(),
    vipExpiresAt: z.iso.datetime().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Нет изменений");

export const planSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  maxParallelGenerations: z.number().int().min(1).max(20),
  maxReferenceImages: z.number().int().min(0).max(30),
  maxReferenceUrls: z.number().int().min(0).max(30),
  maxUploadSizeMb: z.number().int().min(1).max(100),
  watermarkRequired: z.boolean(),
  priorityProcessing: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int(),
});
export const updatePlanSchema = planSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Нет изменений");

export const creditAdjustmentSchema = z.object({
  amount: z
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine(
      (value) => value !== 0,
      "Сумма корректировки не может быть нулевой",
    ),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.uuid(),
});
