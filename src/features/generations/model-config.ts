import type { AspectRatio } from "@/generated/prisma/enums";
import { resolveRequiredProvider } from "./reservation-policy.ts";

export const supportedGenerationAspectRatios: AspectRatio[] = [
  "RATIO_1_1",
  "RATIO_16_9",
  "RATIO_9_16",
  "RATIO_4_3",
  "RATIO_3_4",
];

export function getGenerationModelConfig(aiProvider = process.env.AI_PROVIDER) {
  const provider = resolveRequiredProvider(aiProvider);
  return {
    provider,
    externalModelId:
      provider === "VERTEX_AI"
        ? process.env.VERTEX_IMAGE_MODEL || "gemini-3-pro-image"
        : "fake-interior-v1",
    timeoutSeconds: provider === "VERTEX_AI" ? 180 : 120,
    costPerGeneration: provider === "VERTEX_AI" ? 0.1472 : 0,
  };
}
