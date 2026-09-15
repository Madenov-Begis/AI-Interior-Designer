import { z } from "zod";

export const visualPromptPlacementRegionSchema = z
  .object({
    left: z.number().min(0).max(1),
    top: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
    color: z.string().trim().min(1).max(32),
    kind: z.enum(["rectangle", "stroke"]),
  })
  .strict()
  .refine(
    ({ left, width }) => left + width <= 1.000001,
    "Область выходит за правую границу изображения",
  )
  .refine(
    ({ top, height }) => top + height <= 1.000001,
    "Область выходит за нижнюю границу изображения",
  );
