import { z } from "zod";
import { visualPromptPlacementRegionSchema } from "./placement-schema.ts";

const dimension = z.number().int().positive().max(6000);

const coordinateSpaceSchema = z
  .object({
    editorWidth: dimension,
    editorHeight: dimension,
    sourceWidth: dimension,
    sourceHeight: dimension,
  })
  .strict();

export const visualPromptCanvasStateSchema = z.discriminatedUnion("version", [
  z
    .object({
      version: z.literal(1),
      coordinateSpace: coordinateSpaceSchema,
      fabric: z.record(z.string(), z.unknown()),
    })
    .strict(),
  z
    .object({
      version: z.literal(2),
      coordinateSpace: coordinateSpaceSchema,
      placementRegions: z.array(visualPromptPlacementRegionSchema).max(64),
      fabric: z.record(z.string(), z.unknown()),
    })
    .strict(),
]);

export function parseVisualPromptCanvasState(value: FormDataEntryValue | null) {
  if (typeof value !== "string")
    throw new VisualPromptValidationError(
      "CANVAS_STATE_REQUIRED",
      "Состояние редактора отсутствует",
    );
  try {
    return visualPromptCanvasStateSchema.parse(JSON.parse(value));
  } catch {
    throw new VisualPromptValidationError(
      "INVALID_CANVAS_STATE",
      "Состояние редактора повреждено",
    );
  }
}

export class VisualPromptValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VisualPromptValidationError";
  }
}
