import "server-only";

import { drainStorageDeletions } from "./deletion-outbox";
import { getDb } from "@/server/shared/db/prisma";
import { getStorage } from "@/server/shared/storage";

const unreferencedMedia = {
  projectSourceFor: { none: {} },
  projectSourcePreviewFor: { none: {} },
  projectVisualPromptFor: { none: {} },
  projectReferences: { none: {} },
  generationReferences: { none: {} },
  generationSourceFor: { none: {} },
  generationVisualFor: { none: {} },
  generationOriginalFor: { none: {} },
  generationUserResultFor: { none: {} },
} as const;

export async function deleteMediaFileIfUnreferenced(
  ownerId: string,
  fileId: string | null | undefined,
) {
  if (!fileId) return false;
  const db = getDb();

  try {
    const queued = await db.$transaction(async (tx) => {
      const file = await tx.mediaFile.findFirst({
        where: { id: fileId, ownerId, ...unreferencedMedia },
        select: { id: true, bucket: true, path: true },
      });
      if (!file) return false;
      const deleted = await tx.mediaFile.deleteMany({
        where: { id: fileId, ownerId, ...unreferencedMedia },
      });
      if (!deleted.count) return false;
      // The path survives removal of its MediaFile record even if Storage fails.
      await tx.storageDeletion.upsert({
        where: { bucket_path: { bucket: file.bucket, path: file.path } },
        create: { bucket: file.bucket, path: file.path },
        update: {},
      });
      return true;
    });
    if (queued)
      await drainStorageDeletions(
        db,
        async (bucket, path) => {
          const result = await getStorage()
            .from(bucket)
            .remove([path]);
          if (result.error) throw result.error;
        },
        5,
      );
    return queued;
  } catch (error) {
    console.error("Unreferenced media cleanup failed", {
      ownerId,
      fileId,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
}

// Used after an upload/transaction failure; a lost commit acknowledgement must
// never delete an object already referenced by a committed MediaFile.
export async function discardUploadedObjects(
  files: Array<{ bucket: string; path: string }>,
) {
  const db = getDb();
  for (const file of files) {
    try {
      await db.$transaction(async (tx) => {
        if (
          await tx.mediaFile.findUnique({
            where: { path: file.path },
            select: { id: true },
          })
        )
          return;
        await tx.storageDeletion.upsert({
          where: { bucket_path: file },
          create: file,
          update: {},
        });
      });
    } catch {
      console.error("Could not queue uploaded object cleanup", {
        bucket: file.bucket,
      });
    }
  }
}
