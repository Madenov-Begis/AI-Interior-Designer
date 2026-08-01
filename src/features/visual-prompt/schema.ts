import { z } from "zod";

const dimension = z.number().int().positive().max(6000);

export const visualPromptCanvasStateSchema = z.object({
  version: z.literal(1),
  coordinateSpace: z.object({
    editorWidth: dimension,
    editorHeight: dimension,
    sourceWidth: dimension,
    sourceHeight: dimension,
  }),
  fabric: z.record(z.string(), z.unknown()),
});

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
