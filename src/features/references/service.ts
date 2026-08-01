import "server-only";

import { randomUUID } from "node:crypto";
import { REFERENCE_IMAGE_RULES, STORAGE_BUCKETS } from "@/config/storage";
import { validateReferenceImage } from "@/features/media/image-validation";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class ReferenceProjectNotFoundError extends Error {}
export class ReferenceNotFoundError extends Error {}
export class ReferenceLimitError extends Error {}

async function getProjectCapacity(userId: string, projectId: string) {
  const project = await getDb().project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    select: {
      id: true,
      _count: { select: { references: true } },
      user: { select: { plan: { select: { maxReferenceImages: true } } } },
    },
  });
  if (!project) throw new ReferenceProjectNotFoundError("Проект не найден");
  return {
    count: project._count.references,
    limit:
      project.user.plan?.maxReferenceImages ?? REFERENCE_IMAGE_RULES.maxCount,
  };
}

export async function addReferenceFiles(
  userId: string,
  projectId: string,
  files: File[],
  sourceUrls?: Array<string | null>,
) {
  const capacity = await getProjectCapacity(userId, projectId);
  if (files.length === 0)
    throw new ReferenceLimitError("Добавьте хотя бы один файл");
  if (capacity.count + files.length > capacity.limit)
    throw new ReferenceLimitError(
      `Можно добавить не более ${capacity.limit} референсов`,
    );

  const storage = getSupabaseAdmin().storage.from(
    STORAGE_BUCKETS.referenceImages,
  );
  const uploaded: Array<{
    path: string;
    id: string;
    image: Awaited<ReturnType<typeof validateReferenceImage>>;
    sourceUrl: string | null;
  }> = [];
  try {
    for (const [index, file] of files.entries()) {
      const image = await validateReferenceImage(file);
      const id = randomUUID();
      const path = `users/${userId}/projects/${projectId}/references/${id}.webp`;
      const result = await storage.upload(path, image.normalized, {
        contentType: image.mimeType,
        cacheControl: "3600",
        upsert: false,
      });
      if (result.error) throw result.error;
      uploaded.push({
        path,
        id,
        image,
        sourceUrl: sourceUrls?.[index] ?? null,
      });
    }

    return await getDb().$transaction(async (tx) => {
      const current = await tx.projectReference.count({ where: { projectId } });
      const rows = [];
      for (const [index, item] of uploaded.entries()) {
        const file = await tx.mediaFile.create({
          data: {
            id: item.id,
            ownerId: userId,
            bucket: STORAGE_BUCKETS.referenceImages,
            path: item.path,
            originalName: item.image.originalName,
            mimeType: item.image.mimeType,
            extension: item.image.extension,
            sizeBytes: item.image.normalized.byteLength,
            width: item.image.width,
            height: item.image.height,
            checksum: item.image.checksum,
            type: "REFERENCE",
          },
        });
        rows.push(
          await tx.projectReference.create({
            data: {
              projectId,
              fileId: file.id,
              sourceUrl: item.sourceUrl,
              position: current + index,
            },
            select: {
              id: true,
              fileId: true,
              sourceUrl: true,
              position: true,
              createdAt: true,
            },
          }),
        );
      }
      return rows;
    });
  } catch (error) {
    if (uploaded.length)
      await storage.remove(uploaded.map((item) => item.path));
    throw error;
  }
}

export async function deleteReference(
  userId: string,
  projectId: string,
  referenceId: string,
) {
  const db = getDb();
  const reference = await db.projectReference.findFirst({
    where: { id: referenceId, projectId, project: { userId, deletedAt: null } },
    include: { file: true },
  });
  if (!reference) throw new ReferenceNotFoundError("Референс не найден");

  await db.$transaction(async (tx) => {
    await tx.projectReference.delete({ where: { id: reference.id } });
    await tx.mediaFile.update({
      where: { id: reference.fileId },
      data: { deletedAt: new Date() },
    });
    const remaining = await tx.projectReference.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (const [position, row] of remaining.entries()) {
      await tx.projectReference.update({
        where: { id: row.id },
        data: { position },
      });
    }
  });
  await getSupabaseAdmin()
    .storage.from(reference.file.bucket)
    .remove([reference.file.path]);
}

export async function clearReferences(userId: string, projectId: string) {
  const db = getDb();
  const project = await db.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    select: { references: { include: { file: true } } },
  });
  if (!project) throw new ReferenceProjectNotFoundError("Проект не найден");

  await db.$transaction(async (tx) => {
    await tx.projectReference.deleteMany({ where: { projectId } });
    if (project.references.length)
      await tx.mediaFile.updateMany({
        where: { id: { in: project.references.map((item) => item.fileId) } },
        data: { deletedAt: new Date() },
      });
  });
  const byBucket = Map.groupBy(project.references, (item) => item.file.bucket);
  for (const [bucket, items] of byBucket) {
    await getSupabaseAdmin()
      .storage.from(bucket)
      .remove(items.map((item) => item.file.path));
  }
}

export async function reorderReferences(
  userId: string,
  projectId: string,
  referenceIds: string[],
) {
  const db = getDb();
  const existing = await db.projectReference.findMany({
    where: { projectId, project: { userId, deletedAt: null } },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  if (
    existing.length !== referenceIds.length ||
    existing.some((row) => !referenceIds.includes(row.id))
  ) {
    throw new ReferenceNotFoundError(
      "Список референсов изменился — обновите страницу",
    );
  }

  await db.$transaction(async (tx) => {
    for (const [index, id] of referenceIds.entries()) {
      await tx.projectReference.update({
        where: { id },
        data: { position: -(index + 1) },
      });
    }
    for (const [position, id] of referenceIds.entries()) {
      await tx.projectReference.update({ where: { id }, data: { position } });
    }
  });
}
