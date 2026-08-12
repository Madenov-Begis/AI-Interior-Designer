import { z } from "zod";
import { getSystemLimits } from "@/server/shared/config/system-limits";

export function reorderReferencesSchema() {
  return z.object({
  referenceIds: z
    .array(z.uuid())
    .min(1)
    .max(getSystemLimits().maxReferenceImages)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Список содержит повторяющиеся элементы",
    ),
  });
}

export function importReferenceUrlsSchema() {
  return z.object({
    urls: z.array(z.url()).min(1).max(getSystemLimits().maxReferenceUrls),
  });
}
