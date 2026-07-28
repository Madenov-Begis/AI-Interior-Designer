import "server-only";

import { randomUUID } from "node:crypto";
import { REFERENCE_IMAGE_RULES, STORAGE_BUCKETS } from "@/config/storage";
import { validateReferenceImage } from "@/features/media/image-validation";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class RefinementParentNotFoundError extends Error {}

export async function uploadRefinementReferences(
  userId: string,
  parentGenerationId: string,
  files: File[],
) {
  if (files.length === 0) throw new Error("REFERENCE_REQUIRED");
  if (files.length > REFERENCE_IMAGE_RULES.maxCount) {
    throw new Error("REFERENCE_LIMIT_EXCEEDED");
  }

  const parent = await getDb().generation.findFirst({
    where: {
      id: parentGenerationId,
      userId,
      status: "SUCCEEDED",
      deletedAt: null,
      resultOriginalId: { not: null },
    },
    select: { id: true },
  });
  if (!parent) throw new RefinementParentNotFoundError();

  const storage = getSupabaseAdmin().storage.from(
    STORAGE_BUCKETS.referenceImages,
  );
  const uploaded: Array<{ id: string; path: string }> = [];
  try {
    const results = [];
    for (const file of files) {
      const image = await validateReferenceImage(file);
      const id = randomUUID();
      const path = `users/${userId}/generations/${parent.id}/refinement-references/${id}.webp`;
      const upload = await storage.upload(path, image.normalized, {
        contentType: image.mimeType,
        cacheControl: "3600",
        upsert: false,
      });
      if (upload.error) throw upload.error;
      uploaded.push({ id, path });

      await getDb().mediaFile.create({
        data: {
          id,
          ownerId: userId,
          bucket: STORAGE_BUCKETS.referenceImages,
          path,
          originalName: image.originalName,
          mimeType: image.mimeType,
          extension: image.extension,
          sizeBytes: image.normalized.byteLength,
          width: image.width,
          height: image.height,
          checksum: image.checksum,
          type: "REFERENCE",
        },
      });
      results.push({
        id,
        fileId: id,
        width: image.width,
        height: image.height,
      });
    }
    return results;
  } catch (error) {
    if (uploaded.length) {
      await storage.remove(uploaded.map((item) => item.path));
      await getDb().mediaFile.deleteMany({
        where: { id: { in: uploaded.map((item) => item.id) } },
      });
    }
    throw error;
  }
}
