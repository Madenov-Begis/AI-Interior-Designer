import { z } from "zod";

const nullablePositiveInt = z.number().int().positive().nullable();

export const adminListSchema = z.object({ cursor: z.uuid().optional(), limit: z.coerce.number().int().min(1).max(100).default(30), query: z.string().trim().max(120).optional() });
export const updateUserSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(), status: z.enum(["ACTIVE", "BLOCKED", "DELETED"]).optional(), planId: z.uuid().nullable().optional(),
  dailyLimitOverride: nullablePositiveInt.optional(), maxParallelOverride: nullablePositiveInt.optional(), vipExpiresAt: z.iso.datetime().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "Нет изменений");

export const modelSchema = z.object({
  provider: z.enum(["FAKE", "VERTEX_AI"]), code: z.string().trim().min(2).max(80), externalModelId: z.string().trim().min(1).max(160), name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(), active: z.boolean().default(true), preview: z.boolean().default(false), timeoutSeconds: z.number().int().min(10).max(900).default(120),
  maxReferenceImages: z.number().int().min(0).max(30).default(10), maxInputSizeMb: z.number().int().min(1).max(100).default(15),
  supportedAspectRatios: z.array(z.enum(["RATIO_1_1", "RATIO_16_9", "RATIO_9_16", "RATIO_4_3", "RATIO_3_4"])).min(1), supportsVisualPrompt: z.boolean().default(true), priority: z.number().int().default(0),
});
export const updateModelSchema = modelSchema.partial().refine((value) => Object.keys(value).length > 0, "Нет изменений");

export const planSchema = z.object({
  code: z.string().trim().min(2).max(40), name: z.string().trim().min(1).max(100), description: z.string().trim().max(1000).nullable().optional(), dailyGenerationLimit: nullablePositiveInt,
  maxParallelGenerations: z.number().int().min(1).max(20), maxReferenceImages: z.number().int().min(0).max(30), maxReferenceUrls: z.number().int().min(0).max(30), maxUploadSizeMb: z.number().int().min(1).max(100),
  watermarkRequired: z.boolean(), priorityProcessing: z.boolean(), active: z.boolean(), sortOrder: z.number().int(), modelIds: z.array(z.uuid()).default([]),
});
export const updatePlanSchema = planSchema.partial().refine((value) => Object.keys(value).length > 0, "Нет изменений");

const safeLink = z.url().refine((value) => { const protocol = new URL(value).protocol; return protocol === "https:" || protocol === "http:"; }, "Разрешены только HTTP(S)-ссылки");
export const notificationSchema = z.object({ title: z.string().trim().max(120).nullable().optional(), content: z.string().trim().min(1).max(2000), type: z.enum(["INFO", "WARNING", "SUCCESS", "ERROR"]).default("INFO"), linkUrl: safeLink.nullable().optional(), active: z.boolean().default(true), startsAt: z.iso.datetime().nullable().optional(), endsAt: z.iso.datetime().nullable().optional() });
export const updateNotificationSchema = notificationSchema.partial().refine((value) => Object.keys(value).length > 0, "Нет изменений");
export const settingsSchema = z.record(z.string().min(1).max(100), z.json());
