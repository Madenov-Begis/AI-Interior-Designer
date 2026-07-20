import { z } from "zod";

export const reorderReferencesSchema = z.object({
  referenceIds: z.array(z.uuid()).min(1).max(10).refine((ids) => new Set(ids).size === ids.length, "Список содержит повторяющиеся элементы"),
});

export const importReferenceUrlsSchema = z.object({
  urls: z.array(z.url()).min(1).max(10),
});
