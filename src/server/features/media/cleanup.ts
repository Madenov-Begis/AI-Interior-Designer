import "server-only";

import { removeUnreferencedMediaWithDependencies } from "@/server/features/media/cleanup-operations";
import { getDb } from "@/server/shared/db/prisma";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";

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
    return await removeUnreferencedMediaWithDependencies(fileId, {
      findCandidate: (candidateId) =>
        db.mediaFile.findFirst({
          where: {
            id: candidateId,
            ownerId,
            ...unreferencedMedia,
          },
          select: { id: true, bucket: true, path: true },
        }),
      deleteIfStillUnreferenced: async (candidateId) => {
        const deleted = await db.mediaFile.deleteMany({
          where: {
            id: candidateId,
            ownerId,
            ...unreferencedMedia,
          },
        });
        return deleted.count > 0;
      },
      removeStorageObject: async (bucket, path) => {
        const removed = await getSupabaseAdmin()
          .storage.from(bucket)
          .remove([path]);
        if (removed.error) throw removed.error;
      },
    });
  } catch (error) {
    console.error("Unreferenced media cleanup failed", {
      ownerId,
      fileId,
      error,
    });
    return false;
  }
}
