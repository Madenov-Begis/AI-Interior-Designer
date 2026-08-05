import "server-only";

import { randomUUID } from "node:crypto";
import { STORAGE_BUCKETS } from "@/server/shared/config/storage";
import { deleteMediaFileIfUnreferenced } from "@/server/features/media/cleanup";
import {
  DEFAULT_PROJECT_NAME,
  projectNameFromSourceFile,
} from "@/server/features/projects/naming";
import { getDb } from "@/server/shared/db/prisma";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";
import { validateSourceImage } from "@/server/features/media/image-validation";
import { validateInteriorSourceImage } from "@/server/features/media/interior-image-validator";

export class ProjectNotFoundError extends Error {}

export async function uploadProjectSource(
  userId: string,
  projectId: string,
  file: File,
) {
  const db = getDb();
  const project = await db.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new ProjectNotFoundError("Проект не найден");

  const image = await validateSourceImage(file);
  await validateInteriorSourceImage(image);
  const sourceId = randomUUID();
  const previewId = randomUUID();
  const sourcePath = `users/${userId}/projects/${projectId}/source/${sourceId}.${image.extension}`;
  const previewPath = `users/${userId}/projects/${projectId}/source/preview/${previewId}.webp`;
  const storage = getSupabaseAdmin().storage.from(STORAGE_BUCKETS.sourceImages);
  const uploaded: string[] = [];

  try {
    const sourceUpload = await storage.upload(sourcePath, image.normalized, {
      contentType: image.mimeType,
      cacheControl: "3600",
      upsert: false,
    });
    if (sourceUpload.error) throw sourceUpload.error;
    uploaded.push(sourcePath);

    const previewUpload = await storage.upload(previewPath, image.preview, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });
    if (previewUpload.error) throw previewUpload.error;
    uploaded.push(previewPath);

    const saved = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "Project" WHERE "id" = ${projectId}::uuid FOR UPDATE`;
      const current = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
        select: { name: true, sourceImageId: true, sourcePreviewId: true },
      });
      const source = await tx.mediaFile.create({
        data: {
          id: sourceId,
          ownerId: userId,
          bucket: STORAGE_BUCKETS.sourceImages,
          path: sourcePath,
          originalName: image.originalName,
          mimeType: image.mimeType,
          extension: image.extension,
          sizeBytes: image.normalized.byteLength,
          width: image.width,
          height: image.height,
          checksum: image.checksum,
          type: "SOURCE_IMAGE",
        },
      });
      const preview = await tx.mediaFile.create({
        data: {
          id: previewId,
          ownerId: userId,
          bucket: STORAGE_BUCKETS.sourceImages,
          path: previewPath,
          originalName: image.originalName,
          mimeType: "image/webp",
          extension: "webp",
          sizeBytes: image.preview.byteLength,
          width: Math.min(image.width, 1600),
          height: Math.round(image.height * Math.min(1, 1600 / image.width)),
          checksum: null,
          type: "SOURCE_PREVIEW",
        },
      });
      await tx.project.update({
        where: { id: projectId },
        data: {
          ...(current.name === DEFAULT_PROJECT_NAME
            ? { name: projectNameFromSourceFile(image.originalName) }
            : {}),
          sourceImageId: source.id,
          sourcePreviewId: preview.id,
          status: "READY",
        },
      });
      return {
        source,
        preview,
        replacedSourceImageId: current.sourceImageId,
        replacedSourcePreviewId: current.sourcePreviewId,
      };
    });
    await Promise.all([
      deleteMediaFileIfUnreferenced(userId, saved.replacedSourceImageId),
      deleteMediaFileIfUnreferenced(userId, saved.replacedSourcePreviewId),
    ]);
    return { source: saved.source, preview: saved.preview };
  } catch (error) {
    if (uploaded.length) await storage.remove(uploaded);
    throw error;
  }
}
