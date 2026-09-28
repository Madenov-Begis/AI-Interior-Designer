import "server-only";

import { discardUploadedObjects } from "@/server/features/media/cleanup";
import { randomUUID } from "node:crypto";

import { STORAGE_BUCKETS } from "@/server/shared/config/storage";
import {
  classifyGenerationFailure,

} from "@/server/features/generations/execution-policy";
import { getGenerationModelConfig } from "@/server/features/generations/model-config";
import { normalizeRefinementOutput } from "@/server/features/generations/refinement-output";
import { failGenerationWithDatabase } from "@/server/features/generations/operations";
import { getImageGenerationProvider } from "@/server/features/generations/provider";
import { getDb } from "@/server/shared/db/prisma";
import { getStorage } from "@/server/shared/storage";
import { getSystemLimits } from "@/server/shared/config/system-limits";
import { constrainOutputDimensions } from "@/server/features/generations/output-limits";
import { settleFailedGeneration } from "./failure-cleanup";
import { claimExecution, beginProvider, releasePreparation, lockRegulator, type DispatchConfig } from "./execution-store";
import { serverEnv } from "../../shared/config/env";
import { canStartProvider, reserveInputs, imageGate } from "./worker-resources";
import { normalizeProviderOutput } from "./provider-output";
import { providerFailure, retryDelay } from "./worker-policy";

export function dispatchConfig(): DispatchConfig {
  const env = serverEnv();
  const model = getGenerationModelConfig(env.AI_PROVIDER);
  return { key: `${model.provider}:${model.externalModelId}`, mode: env.WORKER_MODE,
    initial: env.WORKER_MODE === "adaptive" ? env.WORKER_ADAPTIVE_INITIAL : env.WORKER_CONCURRENCY,
    maximum: env.WORKER_MODE === "adaptive" ? env.WORKER_ADAPTIVE_MAX : env.WORKER_CONCURRENCY,
    startsPerSecond: env.WORKER_STARTS_PER_SECOND, tempBudgetBytes: env.WORKER_TEMP_BUDGET_MB * 1024 ** 2 };
}

type StoredFile = { bucket: string; path: string; mimeType: string };

async function downloadStoredFile(file: StoredFile) {
  const download = await getStorage()
    .from(file.bucket)
    .download(file.path);
  if (download.error || !download.data)
    throw new Error("SOURCE_DOWNLOAD_FAILED");
  return {
    data: Buffer.from(await download.data.arrayBuffer()),
    mimeType: file.mimeType,
  };
}

async function markFailed(generationId: string, code: string, message: string, claimToken: string) {
  await failGenerationWithDatabase(getDb(), {
    generationId,
    code,
    message,
    claimToken,
  });
}

export async function processGeneration(generationId: string, signal?: AbortSignal) {
  if (signal?.aborted) return;
  const db = getDb();
  const config = dispatchConfig();
  const candidate = await db.generationExecution.findUnique({ where: { generationId } });
  const isRaw = candidate?.stage === "RAW_READY";
  if (!isRaw && !(await canStartProvider())) return;
  // Разрешение на обработку берётся до чтения сырого результата в память.
  const releaseImage: (() => void) | undefined = isRaw ? await imageGate.acquire() : undefined;
  let execution;
  try { execution = await claimExecution(db, generationId, config); }
  catch (error) { releaseImage?.(); throw error; }
  if (!execution) { releaseImage?.(); return; }
  const owner = execution.owner;
  let leaseLost = false;
  let renewing: Promise<void> | undefined;
  const heartbeat = setInterval(() => {
    if (renewing) return;
    renewing = db.$transaction(async (tx) => {
      await lockRegulator(tx, config.key);
      const result = await tx.generationExecution.updateMany({ where: { generationId, owner, leaseUntil: { gt: new Date() }, generation: { status: "PROCESSING", jobId: owner } }, data: { leaseUntil: new Date(Date.now() + 60_000) } });
      if (!result.count) { leaseLost = true; return; }
      const current = await tx.generationExecution.findUnique({ where: { generationId } });
      if (current?.stage === "PREPARING") await tx.generationPermit.updateMany({ where: { generationId, owner }, data: { expiresAt: new Date(Date.now() + 60_000) } });
    }).catch(() => { leaseLost = true; }).finally(() => { renewing = undefined; });
  }, 10_000);
  const startedAt = Date.now();
  let releaseInputs: (() => void) | null = null;
  const uploaded: Array<{ bucket: string; path: string }> = [];
  try {
    const generation = await db.generation.findUnique({
      where: { id: generationId },
      include: {
        sourceImage: true,
        usageEvent: true,
        references: { orderBy: { position: "asc" }, include: { file: true } },
      },
    });
    if (!generation) return;

    if (execution.stage !== "RAW_READY") {
      const bytes = generation.sourceImage.sizeBytes + generation.references.reduce((sum, item) => sum + item.file.sizeBytes, 0);
      if (bytes > serverEnv().WORKER_INPUT_BUDGET_MB * 1024 ** 2) throw new Error("GENERATION_INPUT_BUDGET_EXCEEDED");
      releaseInputs = reserveInputs(bytes);
      if (!releaseInputs) { await releasePreparation(db, generationId, owner); return; }
      const [source, references] = await Promise.all([
        downloadStoredFile(generation.sourceImage),
        Promise.all(generation.references.map((reference) => downloadStoredFile(reference.file))),
      ]);
      while (true) {
        if (signal?.aborted) { await releasePreparation(db, generationId, owner); return; }
        if (await beginProvider(db, generationId, owner, config)) break;
        if (leaseLost) throw new Error("EXECUTION_LEASE_LOST");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const model = getGenerationModelConfig(process.env.AI_PROVIDER);
      const providerAt = Date.now();
      const raw = await getImageGenerationProvider(model.provider, model.externalModelId, model.timeoutSeconds).generateRaw({
        operation: generation.parentGenerationId ? "refinement" : "root", source, references,
        prompt: generation.finalPrompt ?? generation.prompt, aspectRatio: generation.aspectRatio,
        generationId, providerAttempt: execution.providerAttempts + 1,
      });
      console.log(JSON.stringify({ event: "generation_ai", generationId, durationMs: Date.now() - providerAt }));
      if (leaseLost) throw new Error("EXECUTION_LEASE_LOST");
      if (raw.image.byteLength > 64 * 1024 ** 2) throw new Error("PROVIDER_RESULT_TOO_LARGE");
      const rawPath = `users/${generation.userId}/generations/${generationId}/${owner}.raw`;
      const registered = await db.generationExecution.updateMany({ where: { generationId, owner, stage: "SENDING", leaseUntil: { gt: new Date() }, generation: { status: "PROCESSING", jobId: owner } }, data: { rawPath, rawMimeType: raw.mimeType, rawBytes: raw.image.byteLength, providerRequestId: raw.providerRequestId } });
      if (!registered.count) throw new Error("EXECUTION_LEASE_LOST");
      const stored = await getStorage().from(STORAGE_BUCKETS.generationTemporary).upload(rawPath, raw.image, { contentType: raw.mimeType, upsert: false });
      if (stored.error) throw stored.error;
      await db.$transaction(async (tx) => {
        const checkpoint = await tx.generationExecution.updateMany({ where: { generationId, owner, stage: "SENDING", leaseUntil: { gt: new Date() }, generation: { status: "PROCESSING", jobId: owner, usageEvent: { status: "RESERVED", expiresAt: { gt: new Date() } } } }, data: { stage: "RAW_READY", leaseUntil: new Date(0) } });
        if (!checkpoint.count) throw new Error("EXECUTION_LEASE_LOST");
        await tx.generationPermit.deleteMany({ where: { generationId, owner } });
        await tx.generationRegulator.update({ where: { key: config.key }, data: { successes: { increment: 1 } } });
      });
      return;
    }
    const processingAt = Date.now();
    const raw = await downloadStoredFile({ bucket: STORAGE_BUCKETS.generationTemporary, path: execution.rawPath!, mimeType: execution.rawMimeType! });
    const output = await normalizeProviderOutput({ image: raw.data, mimeType: raw.mimeType, providerRequestId: execution.providerRequestId! });
    const metadata = { width: generation.sourceImage.width!, height: generation.sourceImage.height! };
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

    const originalUpload = await getStorage()
      .from(STORAGE_BUCKETS.generationOriginals)
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
        where: { id: generation.id, status: "PROCESSING", jobId: owner,
          execution: { owner, leaseUntil: { gt: new Date() }, stage: "RAW_READY" },
          usageEvent: { status: "RESERVED", expiresAt: { gt: new Date() } },
        },
        data: {
          status: "SUCCEEDED",
          resultOriginalId: originalId,
          resultUserId: originalId,
          providerRequestId: output.providerRequestId,
          durationMs: Date.now() - (generation.startedAt?.getTime() || startedAt),
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
    console.log(JSON.stringify({ event: "generation_processed", generationId, durationMs: Date.now() - processingAt, totalMs: Date.now() - (generation.startedAt?.getTime() || startedAt) }));
  } catch (error) {
    // Потеря подтверждения checkpoint не должна повторить AI или удалить сохранённый ответ.
    if (!isRaw) {
      const current = await db.generationExecution.findUnique({ where: { generationId } });
      if (current?.stage === "RAW_READY") return;
    }
    const failureInfo = providerFailure(error);
    if (failureInfo.throttled && !leaseLost) {
      const retried = await db.$transaction(async (tx) => {
        await lockRegulator(tx, config.key);
        const current = await tx.generationExecution.findFirst({ where: { generationId, owner, stage: "SENDING", leaseUntil: { gt: new Date() }, generation: { status: "PROCESSING", jobId: owner } }, include: { generation: { include: { usageEvent: true } } } });
        if (!current) return false;
        const regulator = await tx.generationRegulator.findUniqueOrThrow({ where: { key: config.key } });
        await tx.generationRegulator.update({ where: { key: config.key }, data: { limit: config.mode === "adaptive" ? Math.max(1, Math.floor(regulator.limit / 2)) : regulator.limit, cooldownUntil: new Date(Date.now() + 30_000), successes: 0 } });
        await tx.generationPermit.deleteMany({ where: { generationId, owner } });
        const nextAttemptAt = new Date(Date.now() + retryDelay(current.providerAttempts, failureInfo.retryAfterMs));
        console.log(JSON.stringify({ event: "generation_throttled", generationId, attempt: current.providerAttempts, retryAt: nextAttemptAt.getTime() }));
        if (current.providerAttempts >= 3 || nextAttemptAt >= current.generation.usageEvent!.expiresAt!) return false;
        await tx.generationExecution.update({ where: { generationId }, data: { stage: "RETRY_WAIT", nextAttemptAt, leaseUntil: new Date(0) } });
        return true;
      });
      if (retried) return;
    }
    const failure = classifyGenerationFailure(error);
    const cleanup = await settleFailedGeneration({
      markFailed: () => markFailed(generationId, failure.code, failure.message, owner),
      readStatus: async () => (await db.generation.findUnique({ where: { id: generationId }, select: { status: true } }))?.status ?? null,
      files: uploaded,
      removeFile: (item) => discardUploadedObjects([item]),
    });
    if (cleanup.cleanupFailures) console.error(JSON.stringify({ event: "generation_cleanup_incomplete", generationId }));
  } finally {
    clearInterval(heartbeat);
    await renewing;
    releaseInputs?.();
    releaseImage?.();
  }
}
