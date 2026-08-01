import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).default("Новый дизайн"),
});

export const listProjectsSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const projectIdSchema = z.uuid();

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    prompt: z.string().trim().max(4000).nullable().optional(),
    aspectRatio: z
      .enum(["RATIO_1_1", "RATIO_16_9", "RATIO_9_16", "RATIO_4_3", "RATIO_3_4"])
      .optional(),
    status: z.enum(["DRAFT", "READY", "ARCHIVED"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Нет изменений");
