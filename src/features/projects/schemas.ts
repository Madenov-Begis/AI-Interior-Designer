import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).default("Новый дизайн"),
});

export const listProjectsSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const projectIdSchema = z.uuid();
