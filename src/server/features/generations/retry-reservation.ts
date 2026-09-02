import type { AspectRatio } from "../../../generated/prisma/enums.ts";
import { isInteriorStyleCode } from "./interior-styles.ts";

type RetrySource = {
  projectId: string;
  parentGenerationId: string | null;
  prompt: string;
  styleCode: string | null;
  aspectRatio: AspectRatio;
  visualPromptImageId: string | null;
  references: Array<{ fileId: string }>;
};

export function buildRetryReservationPlan(generation: RetrySource) {
  if (generation.parentGenerationId) {
    return {
      kind: "refinement" as const,
      input: {
        parentGenerationId: generation.parentGenerationId,
        prompt: generation.prompt,
        referenceFileIds: generation.references.map(
          (reference) => reference.fileId,
        ),
        visualPromptImageId: generation.visualPromptImageId ?? undefined,
      },
    };
  }

  return {
    kind: "root" as const,
    input: {
      projectId: generation.projectId,
      prompt: generation.prompt,
      aspectRatio: generation.aspectRatio,
      styleCode: isInteriorStyleCode(generation.styleCode)
        ? generation.styleCode
        : undefined,
    },
  };
}
