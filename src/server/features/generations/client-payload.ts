import "server-only";

import {
  getOwnedGeneration,
  readGenerationLabels,
} from "@/server/features/generations/service";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";
import type { Locale } from "@/i18n/routing";
import { localizeGenerationMessage } from "@/server/shared/i18n/api-locale";

export class GenerationClientPayloadError extends Error {
  constructor(
    readonly code: "GENERATION_NOT_FOUND" | "SIGNED_URL_FAILED",
    message: string,
  ) {
    super(message);
  }
}

export async function getGenerationClientPayload(
  userId: string,
  generationId: string,
  locale: Locale = "en",
) {
  const generation = await getOwnedGeneration(userId, generationId);
  if (!generation) {
    throw new GenerationClientPayloadError(
      "GENERATION_NOT_FOUND",
      "Генерация не найдена",
    );
  }

  const labels = await readGenerationLabels(userId, [generation.projectId]);
  let resultUrl: string | null = null;
  if (generation.resultUser) {
    const signed = await getSupabaseAdmin()
      .storage.from(generation.resultUser.bucket)
      .createSignedUrl(generation.resultUser.path, 600);
    if (signed.error || !signed.data.signedUrl) {
      throw new GenerationClientPayloadError(
        "SIGNED_URL_FAILED",
        "Не удалось открыть результат",
      );
    }
    resultUrl = signed.data.signedUrl;
  }

  return {
    generation: {
      id: generation.id,
      variantNumber: labels.get(generation.id) ?? "—",
      parentGenerationId: generation.parentGenerationId,
      status: generation.status,
      prompt: generation.prompt,
      aspectRatio: generation.aspectRatio,
      resultUserId: generation.resultUserId,
      resultUrl,
      resultUser: generation.resultUser
        ? {
            width: generation.resultUser.width,
            height: generation.resultUser.height,
          }
        : null,
      references: generation.references,
      errorCode: generation.errorCode,
      errorMessage: localizeGenerationMessage(
        locale,
        generation.errorCode,
        generation.errorMessage,
      ),
      createdAt: generation.createdAt.toISOString(),
      completedAt: generation.completedAt?.toISOString() ?? null,
    },
  };
}
