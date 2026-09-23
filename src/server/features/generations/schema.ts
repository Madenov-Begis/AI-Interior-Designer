import { z } from "zod";
import { INTERIOR_STYLE_CODES } from "./interior-styles.ts";

const optionalPromptSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().optional().default(""),
);

export const createGenerationSchema = z
  .object({
    projectId: z.uuid(),
    roomTypeId: z.uuid(),
    prompt: optionalPromptSchema,
    aspectRatio: z
      .enum(["RATIO_1_1", "RATIO_16_9", "RATIO_9_16", "RATIO_4_3", "RATIO_3_4"])
      .default("RATIO_16_9"),
    styleCode: z.enum(INTERIOR_STYLE_CODES).optional(),
  })
  .strict();

export const createRefinementSchema = z
  .object({
    prompt: optionalPromptSchema,
    referenceFileIds: z.array(z.uuid()).max(10),
  })
  .strict();

export const refinementVisualPromptPairSchema = z
  .object({
    overlayPresent: z.boolean(),
    canvasStatePresent: z.boolean(),
  })
  .strict()
  .refine(
    ({ overlayPresent, canvasStatePresent }) =>
      overlayPresent === canvasStatePresent,
    { message: "Разметка и состояние холста должны быть переданы вместе" },
  );

export const idempotencyKeySchema = z.string().trim().min(16).max(128);

export const generationIdSchema = z.uuid();

export const listGenerationsSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z
    .enum([
      "QUEUED",
      "PROCESSING",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
      "REJECTED",
    ])
    .optional(),
  projectId: z.uuid().optional(),
});
