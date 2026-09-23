import "server-only";

import { ensureGenerationsEnabled } from "@/server/features/generations/emergency-stop";
import { Modality } from "@google/genai";
import { resolveRequiredProvider } from "@/server/features/generations/reservation-policy";
import type { ValidatedSourceImage } from "@/server/features/media/image-validation";
import { ImageValidationError } from "@/server/features/media/image-validation";
import {
  INTERIOR_IMAGE_CLASSIFIER_PROMPT,
  parseInteriorImageDecision,
} from "@/server/features/media/interior-image-policy";
import { isRetryableInteriorImageValidationFailure } from "@/server/features/media/interior-image-validation-retry";
import { createVertexGenAi } from "@/server/shared/integrations/google/vertex-client";

const VALIDATION_TIMEOUT_SECONDS = 45;
const VALIDATION_MAX_ATTEMPTS = 2;
const VALIDATION_RETRY_DELAY_MS = 500;

export class InteriorImageValidationUnavailableError extends Error {
  constructor(
    readonly modelId: string,
    readonly attempts: number,
    options: ErrorOptions,
  ) {
    super(
      "Не удалось проверить фотографию. Попробуйте загрузить её ещё раз.",
      options,
    );
    this.name = "InteriorImageValidationUnavailableError";
  }
}

function validationModelId() {
  return (
    process.env.VERTEX_IMAGE_VALIDATION_MODEL?.trim() || "gemini-2.5-flash"
  );
}

export async function validateInteriorSourceImage(image: ValidatedSourceImage) {
  const provider = resolveRequiredProvider(process.env.AI_PROVIDER ?? "fake");
  if (provider === "FAKE") return;
  ensureGenerationsEnabled();

  const modelId = validationModelId();
  for (let attempt = 1; attempt <= VALIDATION_MAX_ATTEMPTS; attempt += 1) {
    try {
      const ai = await createVertexGenAi(VALIDATION_TIMEOUT_SECONDS);
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Классифицируй эту исходную фотографию по системным правилам.",
              },
              {
                inlineData: {
                  data: image.normalized.toString("base64"),
                  mimeType: image.mimeType,
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: INTERIOR_IMAGE_CLASSIFIER_PROMPT,
          responseModalities: [Modality.TEXT],
          temperature: 0,
          maxOutputTokens: 32,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const decision = parseInteriorImageDecision(response.text);
      if (!decision) throw new Error("INTERIOR_VALIDATION_RESPONSE_INVALID");
      if (decision === "NOT_INTERIOR") {
        throw new ImageValidationError(
          "IMAGE_NOT_INTERIOR",
          "Загрузите фотографию интерьера помещения. Фасады, экстерьеры и улицы не поддерживаются.",
        );
      }
      return;
    } catch (error) {
      if (error instanceof ImageValidationError) throw error;
      const canRetry =
        attempt < VALIDATION_MAX_ATTEMPTS &&
        isRetryableInteriorImageValidationFailure(error);
      if (canRetry) {
        await new Promise((resolve) =>
          setTimeout(resolve, VALIDATION_RETRY_DELAY_MS * attempt),
        );
        continue;
      }
      throw new InteriorImageValidationUnavailableError(modelId, attempt, {
        cause: error,
      });
    }
  }
}
