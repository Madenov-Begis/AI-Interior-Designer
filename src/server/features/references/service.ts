import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { STORAGE_BUCKETS } from "@/server/shared/config/storage";
import { validateReferenceImage } from "@/server/features/media/image-validation";
import {
  deleteMediaFileIfUnreferenced,
  discardUploadedObjects,
} from "@/server/features/media/cleanup";
import { getDb } from "@/server/shared/db/prisma";
import { getStorage } from "@/server/shared/storage";
import { getSystemLimits } from "@/server/shared/config/system-limits";

export class ReferenceProjectNotFoundError extends Error {}
export class ReferenceNotFoundError extends Error {}
export class ReferenceLimitError extends Error {}

async function lockOwnedProject(
  tx: Prisma.TransactionClient,
  userId: string,
  projectId: string,
) {
  await tx.$executeRaw`SELECT 1 FROM "Project" WHERE "id" = ${projectId}::uuid FOR UPDATE`;
  const project = await tx.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new ReferenceProjectNotFoundError("Проект не найден");
}

export async function attachReferencePreviewUrls<
  TReference extends { fileId: string },
>(userId: string, references: TReference[]) {
  if (references.length === 0) return [];
  const files = await getDb().mediaFile.findMany({
    where: {
      id: { in: references.map((reference) => reference.fileId) },
      ownerId: userId,
      deletedAt: null,
    },
    select: { id: true, bucket: true, path: true },
  });
  const filesById = new Map(files.map((file) => [file.id, file]));
  return Promise.all(
    references.map(async (reference) => {
      const file = filesById.get(reference.fileId);
      if (!file) throw new ReferenceNotFoundError("Референс не найден");
      const signed = await getStorage()
        .from(file.bucket)
        .createSignedUrl(file.path, 600);
      if (signed.error || !signed.data.signedUrl) throw signed.error;
      return { ...reference, previewUrl: signed.data.signedUrl };
    }),
  );
}

async function getProjectCapacity(userId: string, projectId: string) {
  const project = await getDb().project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    select: {
      id: true,
      _count: { select: { references: true } },
    },
  });
  if (!project) throw new ReferenceProjectNotFoundError("Проект не найден");
  return {
    count: project._count.references,
    limit: getSystemLimits().maxReferenceImages,
  };
}

export async function addReferenceFiles(
  userId: string,
  projectId: string,
  files: File[],
  sourceUrls?: Array<string | null>,
) {
  const capacity = await getProjectCapacity(userId, projectId);
  const limits = getSystemLimits();
  const incomingUrlCount = sourceUrls?.filter(Boolean).length ?? 0;
  if (files.length === 0)
    throw new ReferenceLimitError("Добавьте хотя бы один файл");
  if (capacity.count + files.length > capacity.limit)
    throw new ReferenceLimitError(
      `Можно добавить не более ${capacity.limit} референсов`,
    );
  if (incomingUrlCount > limits.maxReferenceUrls)
    throw new ReferenceLimitError(
      `Можно добавить не более ${limits.maxReferenceUrls} референсов по URL`,
    );

  const storage = getStorage().from(
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
      await lockOwnedProject(tx, userId, projectId);
      const current = await tx.projectReference.count({ where: { projectId } });
      if (current + uploaded.length > capacity.limit)
        throw new ReferenceLimitError(
          `Можно добавить не более ${capacity.limit} референсов`,
        );
      const currentUrlCount = incomingUrlCount
        ? await tx.projectReference.count({
            where: { projectId, sourceUrl: { not: null } },
          })
        : 0;
      if (currentUrlCount + incomingUrlCount > limits.maxReferenceUrls)
        throw new ReferenceLimitError(
          `Можно добавить не более ${limits.maxReferenceUrls} референсов по URL`,
        );
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
      await discardUploadedObjects(
        uploaded.map((item) => ({
          bucket: STORAGE_BUCKETS.referenceImages,
          path: item.path,
        })),
      );
    throw error;
  }
}

export async function deleteReference(
  userId: string,
  projectId: string,
  referenceId: string,
) {
  const db = getDb();
  const reference = await db.$transaction(async (tx) => {
    await lockOwnedProject(tx, userId, projectId);
    const reference = await tx.projectReference.findFirst({
      where: { id: referenceId, projectId },
      select: { id: true, fileId: true },
    });
    if (!reference) throw new ReferenceNotFoundError("Референс не найден");
    await tx.projectReference.delete({ where: { id: reference.id } });
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
    return reference;
  });
  await deleteMediaFileIfUnreferenced(userId, reference.fileId);
}

export async function clearReferences(userId: string, projectId: string) {
  const db = getDb();
  const project = await db.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new ReferenceProjectNotFoundError("Проект не найден");

  const deleted = await db.$transaction(async (tx) => {
    await lockOwnedProject(tx, userId, projectId);
    const references = await tx.projectReference.findMany({
      where: { projectId },
      select: { fileId: true },
    });
    await tx.projectReference.deleteMany({ where: { projectId } });
    return references;
  });
  await Promise.all(
    deleted.map((reference) =>
      deleteMediaFileIfUnreferenced(userId, reference.fileId),
    ),
  );
}

export async function reorderReferences(
  userId: string,
  projectId: string,
  referenceIds: string[],
) {
  const db = getDb();
  await db.$transaction(async (tx) => {
    await lockOwnedProject(tx, userId, projectId);
    const existing = await tx.projectReference.findMany({
      where: { projectId },
      select: { id: true },
    });
    if (
      new Set(referenceIds).size !== referenceIds.length ||
      existing.length !== referenceIds.length ||
      existing.some((row) => !referenceIds.includes(row.id))
    ) {
      throw new ReferenceNotFoundError(
        "Список референсов изменился — обновите страницу",
      );
    }
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
