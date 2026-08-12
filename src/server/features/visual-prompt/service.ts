import "server-only";

import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { Prisma } from "@/generated/prisma/client";
import { STORAGE_BUCKETS, VISUAL_PROMPT_RULES } from "@/server/shared/config/storage";
import { deleteMediaFileIfUnreferenced } from "@/server/features/media/cleanup";
import { getDb } from "@/server/shared/db/prisma";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";
import type { VisualPromptCanvasState } from "@/server/features/visual-prompt/types";
import { VisualPromptValidationError } from "@/server/features/visual-prompt/schema";
import { getSystemLimits } from "@/server/shared/config/system-limits";

export class VisualPromptProjectNotFoundError extends Error {}

async function readOverlay(file: File, state: VisualPromptCanvasState) {
  const limits = getSystemLimits();
  if (file.size <= 0)
    throw new VisualPromptValidationError(
      "OVERLAY_REQUIRED",
      "Разметка отсутствует",
    );
  if (file.size > limits.maxUploadSizeBytes)
    throw new VisualPromptValidationError(
      "OVERLAY_TOO_LARGE",
      `Разметка превышает ${limits.maxUploadSizeMb} МБ`,
    );

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  if (detected?.mime !== "image/png")
    throw new VisualPromptValidationError(
      "INVALID_OVERLAY",
      "Разметка должна быть корректным PNG",
    );

  try {
    const metadata = await sharp(buffer, { failOn: "error" }).metadata();
    if (
      metadata.width !== state.coordinateSpace.editorWidth ||
      metadata.height !== state.coordinateSpace.editorHeight
    ) {
      throw new VisualPromptValidationError(
        "OVERLAY_SIZE_MISMATCH",
        "Размер разметки не совпадает с состоянием редактора",
      );
    }
  } catch (error) {
    if (error instanceof VisualPromptValidationError) throw error;
    throw new VisualPromptValidationError(
      "INVALID_OVERLAY",
      "Не удалось декодировать разметку",
    );
  }

  return buffer;
}

export async function saveVisualPrompt(
  userId: string,
  projectId: string,
  overlayFile: File,
  state: VisualPromptCanvasState,
  options: { attachToProject?: boolean } = {},
) {
  const db = getDb();
  const project = await db.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    include: { sourceImage: true },
  });
  if (!project?.sourceImage)
    throw new VisualPromptProjectNotFoundError(
      "Проект или исходное изображение не найдены",
    );

  const overlay = await readOverlay(overlayFile, state);
  const storage = getSupabaseAdmin();
  const sourceDownload = await storage.storage
    .from(project.sourceImage.bucket)
    .download(project.sourceImage.path);
  if (sourceDownload.error || !sourceDownload.data)
    throw new Error("SOURCE_DOWNLOAD_FAILED");

  const source = Buffer.from(await sourceDownload.data.arrayBuffer());
  const sourceMetadata = await sharp(source, { failOn: "error" }).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height)
    throw new Error("SOURCE_DIMENSIONS_MISSING");
  if (
    sourceMetadata.width !== state.coordinateSpace.sourceWidth ||
    sourceMetadata.height !== state.coordinateSpace.sourceHeight
  ) {
    throw new VisualPromptValidationError(
      "SOURCE_SIZE_MISMATCH",
      "Исходное изображение изменилось — перезагрузите редактор",
    );
  }

  const scaledOverlay = await sharp(overlay)
    .resize(sourceMetadata.width, sourceMetadata.height, { fit: "fill" })
    .png()
    .toBuffer();
  const flattened = await sharp(source)
    .rotate()
    .toColorspace("srgb")
    .composite([{ input: scaledOverlay, blend: "over" }])
    .webp({ quality: VISUAL_PROMPT_RULES.outputQuality })
    .toBuffer();

  const fileId = randomUUID();
  const path = `users/${userId}/projects/${projectId}/visual-prompt/${fileId}.webp`;
  const bucket = STORAGE_BUCKETS.visualPrompts;
  const upload = await storage.storage.from(bucket).upload(path, flattened, {
    contentType: "image/webp",
    cacheControl: "3600",
    upsert: false,
  });
  if (upload.error) throw upload.error;

  try {
    const saved = await db.$transaction(async (tx) => {
      const media = await tx.mediaFile.create({
        data: {
          id: fileId,
          ownerId: userId,
          bucket,
          path,
          originalName: "visual-prompt.webp",
          mimeType: "image/webp",
          extension: "webp",
          sizeBytes: flattened.byteLength,
          width: sourceMetadata.width,
          height: sourceMetadata.height,
          type: "VISUAL_PROMPT",
        },
      });

      if (options.attachToProject !== false) {
        await tx.$executeRaw`SELECT 1 FROM "Project" WHERE "id" = ${projectId}::uuid FOR UPDATE`;
        const current = await tx.project.findUnique({
          where: { id: projectId },
          select: { visualPromptId: true },
        });
        await tx.project.update({
          where: { id: projectId },
          data: {
            visualPromptId: media.id,
            visualPromptUsed: true,
            canvasState: state as Prisma.InputJsonValue,
          },
        });
        return {
          media,
          replacedVisualPromptId: current?.visualPromptId ?? null,
        };
      }
      return { media, replacedVisualPromptId: null };
    });
    await deleteMediaFileIfUnreferenced(
      userId,
      saved.replacedVisualPromptId,
    );
    return saved.media;
  } catch (error) {
    await storage.storage.from(bucket).remove([path]);
    throw error;
  }
}

export async function discardUnattachedVisualPrompt(
  userId: string,
  fileId: string,
) {
  return deleteMediaFileIfUnreferenced(userId, fileId);
}

export async function saveGenerationRefinementVisualPrompt(
  userId: string,
  parentGenerationId: string,
  overlayFile: File,
  state: VisualPromptCanvasState,
) {
  const parent = await getDb().generation.findFirst({
    where: {
      id: parentGenerationId,
      userId,
      status: "SUCCEEDED",
      deletedAt: null,
    },
    include: { resultOriginal: true },
  });
  if (!parent?.resultOriginal) {
    throw new VisualPromptProjectNotFoundError("Результат не найден");
  }

  const overlay = await readOverlay(overlayFile, state);
  const storage = getSupabaseAdmin();
  const sourceDownload = await storage.storage
    .from(parent.resultOriginal.bucket)
    .download(parent.resultOriginal.path);
  if (sourceDownload.error || !sourceDownload.data) {
    throw new Error("SOURCE_DOWNLOAD_FAILED");
  }
  const source = Buffer.from(await sourceDownload.data.arrayBuffer());
  const sourceMetadata = await sharp(source, { failOn: "error" }).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height) {
    throw new Error("SOURCE_DIMENSIONS_MISSING");
  }
  if (
    sourceMetadata.width !== state.coordinateSpace.sourceWidth ||
    sourceMetadata.height !== state.coordinateSpace.sourceHeight
  ) {
    throw new VisualPromptValidationError(
      "SOURCE_SIZE_MISMATCH",
      "Результат изменился — перезагрузите редактор",
    );
  }

  const scaledOverlay = await sharp(overlay)
    .resize(sourceMetadata.width, sourceMetadata.height, { fit: "fill" })
    .png()
    .toBuffer();
  const flattened = await sharp(source)
    .rotate()
    .toColorspace("srgb")
    .composite([{ input: scaledOverlay, blend: "over" }])
    .webp({ quality: VISUAL_PROMPT_RULES.outputQuality })
    .toBuffer();
  const fileId = randomUUID();
  const path = `users/${userId}/generations/${parent.id}/refinement-visual-prompts/${fileId}.webp`;
  const bucket = STORAGE_BUCKETS.visualPrompts;
  const upload = await storage.storage.from(bucket).upload(path, flattened, {
    contentType: "image/webp",
    cacheControl: "3600",
    upsert: false,
  });
  if (upload.error) throw upload.error;

  try {
    return await getDb().mediaFile.create({
      data: {
        id: fileId,
        ownerId: userId,
        bucket,
        path,
        originalName: "refinement-visual-prompt.webp",
        mimeType: "image/webp",
        extension: "webp",
        sizeBytes: flattened.byteLength,
        width: sourceMetadata.width,
        height: sourceMetadata.height,
        type: "VISUAL_PROMPT",
      },
    });
  } catch (error) {
    await storage.storage.from(bucket).remove([path]);
    throw error;
  }
}

export async function removeVisualPrompt(userId: string, projectId: string) {
  const db = getDb();
  const project = await db.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new VisualPromptProjectNotFoundError("Проект не найден");

  const removedVisualPromptId = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM "Project" WHERE "id" = ${projectId}::uuid FOR UPDATE`;
    const current = await tx.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { visualPromptId: true },
    });
    await tx.project.update({
      where: { id: projectId },
      data: {
        visualPromptId: null,
        visualPromptUsed: false,
        canvasState: Prisma.JsonNull,
      },
    });
    return current.visualPromptId;
  });
  await deleteMediaFileIfUnreferenced(userId, removedVisualPromptId);
}
