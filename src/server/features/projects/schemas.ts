import { z } from "zod";
import { DEFAULT_PROJECT_NAME } from "@/server/features/projects/naming";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).default(DEFAULT_PROJECT_NAME),
});

export const listProjectsSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const projectIdSchema = z.uuid();
