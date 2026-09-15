import "server-only";

import { discardUploadedObjects } from "@/server/features/media/cleanup";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { STORAGE_BUCKETS } from "@/server/shared/config/storage";
import {
  classifyGenerationFailure,
  generateWithConfiguredProvider,
} from "@/server/features/generations/execution-policy";
import { getGenerationModelConfig } from "@/server/features/generations/model-config";
import { normalizeRefinementOutput } from "@/server/features/generations/refinement-output";
import { failGenerationWithDatabase } from "@/server/features/generations/operations";
import { getImageGenerationProvider } from "@/server/features/generations/provider";
import { getDb } from "@/server/shared/db/prisma";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";
import { getSystemLimits } from "@/server/shared/config/system-limits";
import { constrainOutputDimensions } from "@/server/features/generations/output-limits";
import { settleFailedGeneration } from "./failure-cleanup";
import { getGenerationWorkerInstanceId } from "./worker-instance";

type StoredFile = { bucket: string; path: string; mimeType: string };

async function downloadStoredFile(file: StoredFile) {
  const download = await getSupabaseAdmin()
    .storage.from(file.bucket)
    .download(file.path);
  if (download.error || !download.data)
    throw new Error("SOURCE_DOWNLOAD_FAILED");
  return {
    data: Buffer.from(await download.data.arrayBuffer()),
    mimeType: file.mimeType,
  };
}

async function markFailed(generationId: string, code: string, message: string) {
  await failGenerationWithDatabase(getDb(), {
    generationId,
    code,
    message,
  });
}

export async function processGeneration(generationId: string) {
  const db = getDb();
  const claimed = await db.generation.updateMany({
    where: { id: generationId, status: "QUEUED" },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      jobId: `${getGenerationWorkerInstanceId()}:${generationId}`,
      attemptCount: { increment: 1 },
    },
  });
  if (claimed.count === 0) return;

  const startedAt = Date.now();
  const uploaded: Array<{ bucket: string; path: string }> = [];
  try {
    const generation = await db.generation.findUnique({
      where: { id: generationId },
      include: {
        sourceImage: true,
        references: { orderBy: { position: "asc" }, include: { file: true } },
      },
    });
    if (!generation) return;

    const [source, references] = await Promise.all([
      downloadStoredFile(generation.sourceImage),
      Promise.all(
        generation.references.map((reference) =>
          downloadStoredFile(reference.file),
        ),
      ),
    ]);
    const metadata = await sharp(source.data, { failOn: "error" }).metadata();
    if (!metadata.width || !metadata.height)
      throw new Error("SOURCE_DIMENSIONS_MISSING");

    const model = getGenerationModelConfig(process.env.AI_PROVIDER);
    const output = await generateWithConfiguredProvider(
      {
        configuredProvider: process.env.AI_PROVIDER,
        storedProvider: model.provider,
        modelId: model.externalModelId,
        timeoutSeconds: model.timeoutSeconds,
        input: {
          operation: generation.parentGenerationId ? "refinement" : "root",
          source,
          references,
          prompt: generation.finalPrompt ?? generation.prompt,
          aspectRatio: generation.aspectRatio,
        },
      },
      getImageGenerationProvider,
    );
    const normalizedOutput = generation.parentGenerationId
      ? {
          ...output,
          ...(await normalizeRefinementOutput(
            output.image,
            metadata.width,
            metadata.height,
          )),
        }
      : output;
    const finalizedOutput = await constrainOutputDimensions(
      normalizedOutput,
      getSystemLimits(),
    );
    const originalId = randomUUID();
    const originalPath = `users/${generation.userId}/generations/${generation.id}/original/${originalId}.webp`;

    const originalUpload = await getSupabaseAdmin()
      .storage.from(STORAGE_BUCKETS.generationOriginals)
      .upload(originalPath, finalizedOutput.image, {
        contentType: finalizedOutput.mimeType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (originalUpload.error) throw originalUpload.error;
    uploaded.push({
      bucket: STORAGE_BUCKETS.generationOriginals,
      path: originalPath,
    });
    await db.$transaction(async (tx) => {
      await tx.mediaFile.createMany({
        data: [
          {
            id: originalId,
            ownerId: generation.userId,
            bucket: STORAGE_BUCKETS.generationOriginals,
            path: originalPath,
            originalName: `generation-${generation.id}-original.webp`,
            mimeType: "image/webp",
            extension: "webp",
            sizeBytes: finalizedOutput.image.byteLength,
            width: finalizedOutput.width,
            height: finalizedOutput.height,
            type: "GENERATION_ORIGINAL",
          },
        ],
      });
      const completed = await tx.generation.updateMany({
        where: { id: generation.id, status: "PROCESSING" },
        data: {
          status: "SUCCEEDED",
          resultOriginalId: originalId,
          resultUserId: originalId,
          providerRequestId: output.providerRequestId,
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });
      if (completed.count === 0) throw new Error("GENERATION_NOT_PROCESSING");
      await tx.usageEvent.updateMany({
        where: { generationId: generation.id, status: "RESERVED" },
        data: { status: "CONSUMED", consumedAt: new Date() },
      });
    });
  } catch (error) {
    const failure = classifyGenerationFailure(error);
    const cleanup = await settleFailedGeneration({
      markFailed: () => markFailed(generationId, failure.code, failure.message),
      readStatus: async () =>
        (
          await db.generation.findUnique({
            where: { id: generationId },
            select: { status: true },
          })
        )?.status ?? null,
      files: uploaded,
      removeFile: (item) => discardUploadedObjects([item]),
    });
    if (cleanup.cleanupFailures) {
      console.error("Generation output cleanup incomplete", {
        generationId,
        ...cleanup,
      });
    }
  }
}
