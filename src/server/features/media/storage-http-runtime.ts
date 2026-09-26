import "server-only";
import { getStorage } from "@/server/shared/storage";
import { FilesystemStorage } from "@/server/shared/storage/filesystem";
import { getDb } from "@/server/shared/db/prisma";
import { getSystemLimits } from "@/server/shared/config/system-limits";
import { exactOrigins } from "@/server/shared/security/cors";
import { handleStorageRequest } from "./storage-http";

export async function storageHttpRequest(
  request: Request,
  operation: "read" | "write",
) {
  try {
    const storage = getStorage();
    if (!(storage instanceof FilesystemStorage))
      throw new Error("STORAGE_NOT_CONFIGURED");
    return await handleStorageRequest(request, operation, {
      storage,
      maxUploadBytes: getSystemLimits().maxUploadSizeBytes,
      origins: new Set([
        ...exactOrigins(process.env.APP_ORIGINS),
        ...exactOrigins(process.env.ADMIN_ORIGINS),
      ]),
      async findUpload(path) {
        const db = getDb();
        const record = await db.storageUpload.findUnique({ where: { path } });
        if (!record || record.expiresAt <= new Date()) return null;
        const owner = await db.profile.findFirst({
          where: { id: record.ownerId, status: "ACTIVE", deletedAt: null },
          select: { id: true },
        });
        if (!owner) return null;
        const projectId =
          /^\/projects\/([a-f0-9-]{36})\/(source|references|visual-prompt|generations)$/i.exec(
            record.target,
          )?.[1];
        const generationId =
          /^\/generations\/([a-f0-9-]{36})\/refinements$/i.exec(
            record.target,
          )?.[1];
        if (
          projectId &&
          (await db.project.findFirst({
            where: { id: projectId, userId: record.ownerId, deletedAt: null },
            select: { id: true },
          }))
        )
          return record;
        if (
          generationId &&
          (await db.generation.findFirst({
            where: {
              id: generationId,
              userId: record.ownerId,
              status: "SUCCEEDED",
              deletedAt: null,
              project: { deletedAt: null },
            },
            select: { id: true },
          }))
        )
          return record;
        return null;
      },
      findMedia(bucket, path) {
        return getDb().mediaFile.findFirst({
          where: { bucket, path },
          select: { sizeBytes: true, mimeType: true },
        });
      },
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: "Хранилище временно недоступно",
        },
        meta: { requestId: crypto.randomUUID() },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
