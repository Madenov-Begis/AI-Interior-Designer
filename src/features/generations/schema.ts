import { z } from "zod";

export const createGenerationSchema = z.object({
  projectId: z.uuid(),
  prompt: z.string().trim().min(3).max(4000),
  modelCode: z.string().trim().min(1).max(100).default(process.env.AI_PROVIDER === "vertex" ? "gemini-interior-v1" : "fake-interior-v1"),
  aspectRatio: z.enum(["RATIO_1_1", "RATIO_16_9", "RATIO_9_16", "RATIO_4_3", "RATIO_3_4"]).default("RATIO_16_9"),
});

export const idempotencyKeySchema = z.string().trim().min(16).max(128);

export const generationIdSchema = z.uuid();

export const listGenerationsSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(["QUEUED", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "REJECTED"]).optional(),
  projectId: z.uuid().optional(),
});
