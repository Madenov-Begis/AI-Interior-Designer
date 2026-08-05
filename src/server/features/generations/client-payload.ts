import "server-only";

import { GENERATION_CREDIT_COST } from "@/server/shared/config/product";
import { getCreditWallet } from "@/server/features/credits/service";
import { getOwnedGeneration } from "@/server/features/generations/service";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";

export class GenerationClientPayloadError extends Error {
  constructor(
    readonly code: "GENERATION_NOT_FOUND" | "SIGNED_URL_FAILED",
    message: string,
  ) {
    super(message);
  }
}

type WalletMode = "always" | "terminal" | "never";

export async function getGenerationClientPayload(
  userId: string,
  generationId: string,
  walletMode: WalletMode = "always",
) {
  const generation = await getOwnedGeneration(userId, generationId);
  if (!generation) {
    throw new GenerationClientPayloadError(
      "GENERATION_NOT_FOUND",
      "Генерация не найдена",
    );
  }

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

  const includeWallet =
    walletMode === "always" ||
    (walletMode === "terminal" &&
      generation.status !== "QUEUED" &&
      generation.status !== "PROCESSING");
  const wallet = includeWallet ? await getCreditWallet(userId, 0) : null;

  return {
    generation: {
      id: generation.id,
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
      errorMessage: generation.errorMessage,
      createdAt: generation.createdAt.toISOString(),
      completedAt: generation.completedAt?.toISOString() ?? null,
    },
    wallet: wallet
      ? {
          balance: wallet.balance,
          generationCost: GENERATION_CREDIT_COST,
        }
      : null,
  };
}
