import "server-only";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { STORAGE_BUCKETS } from "@/config/storage";
import {
  classifyGenerationFailure,
  generateWithConfiguredProvider,
} from "@/features/generations/execution-policy";
import { getGenerationModelConfig } from "@/features/generations/model-config";
import { failGenerationWithDatabase } from "@/features/generations/operations";
import { getImageGenerationProvider } from "@/features/generations/provider";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

async function addWatermark(image: Buffer) {
  const metadata = await sharp(image).metadata();
  if (!metadata.width || !metadata.height)
    throw new Error("RESULT_DIMENSIONS_MISSING");
  const fontSize = Math.max(18, Math.round(metadata.width * 0.022));
  const padding = Math.round(fontSize * 0.8);
  const width = Math.round(fontSize * 11.5);
  const height = Math.round(fontSize * 2.2);
  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${fontSize}" fill="#111" fill-opacity="0.72"/><text x="${padding}" y="${Math.round(height * 0.66)}" fill="#afea4d" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="700">AI INTERIOR</text></svg>`,
  );
  return sharp(image)
    .composite([{ input: svg, gravity: "southeast" }])
    .webp({ quality: 90 })
    .toBuffer();
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
        visualPromptImage: true,
        references: { orderBy: { position: "asc" }, include: { file: true } },
        user: {
          include: {
            plan: true,
            subscriptions: {
              where: {
                status: "ACTIVE",
                OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
              },
              orderBy: { startsAt: "desc" },
              take: 1,
              include: { plan: true },
            },
          },
        },
      },
    });
    if (!generation) return;

    const [source, visualPrompt, references] = await Promise.all([
      downloadStoredFile(generation.sourceImage),
      generation.visualPromptUsed && generation.visualPromptImage
        ? downloadStoredFile(generation.visualPromptImage)
        : Promise.resolve(undefined),
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
          source,
          visualPrompt,
          references,
          prompt: generation.finalPrompt ?? generation.prompt,
          aspectRatio: generation.aspectRatio,
        },
      },
      getImageGenerationProvider,
    );
    const activePlan =
      generation.user.subscriptions[0]?.plan ?? generation.user.plan;
    const userImage =
      activePlan?.watermarkRequired === false
        ? output.image
        : await addWatermark(output.image);
    const originalId = randomUUID();
    const userResultId = randomUUID();
    const originalPath = `users/${generation.userId}/generations/${generation.id}/original/${originalId}.webp`;
    const resultPath = `users/${generation.userId}/generations/${generation.id}/result/${userResultId}.webp`;

    const originalUpload = await getSupabaseAdmin()
      .storage.from(STORAGE_BUCKETS.generationOriginals)
      .upload(originalPath, output.image, {
        contentType: output.mimeType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (originalUpload.error) throw originalUpload.error;
    uploaded.push({
      bucket: STORAGE_BUCKETS.generationOriginals,
      path: originalPath,
    });
    const resultUpload = await getSupabaseAdmin()
      .storage.from(STORAGE_BUCKETS.generationResults)
      .upload(resultPath, userImage, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
    if (resultUpload.error) throw resultUpload.error;
    uploaded.push({
      bucket: STORAGE_BUCKETS.generationResults,
      path: resultPath,
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
            sizeBytes: output.image.byteLength,
            width: output.width,
            height: output.height,
            type: "GENERATION_ORIGINAL",
          },
          {
            id: userResultId,
            ownerId: generation.userId,
            bucket: STORAGE_BUCKETS.generationResults,
            path: resultPath,
            originalName: `interior-design-${generation.id}.webp`,
            mimeType: "image/webp",
            extension: "webp",
            sizeBytes: userImage.byteLength,
            width: output.width,
            height: output.height,
            type: "GENERATION_RESULT",
          },
        ],
      });
      await tx.generation.update({
        where: { id: generation.id },
        data: {
          status: "SUCCEEDED",
          resultOriginalId: originalId,
          resultUserId: userResultId,
          providerRequestId: output.providerRequestId,
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });
      await tx.usageEvent.updateMany({
        where: { generationId: generation.id, status: "RESERVED" },
        data: { status: "CONSUMED", consumedAt: new Date() },
      });
    });
  } catch (error) {
    for (const item of uploaded)
      await getSupabaseAdmin().storage.from(item.bucket).remove([item.path]);
    const failure = classifyGenerationFailure(error);
    await markFailed(generationId, failure.code, failure.message);
  }
}
