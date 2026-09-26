import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import { getStorage } from "@/server/shared/storage";
import { AdminServiceError } from "./http";

export async function getAdminMediaSignedUrl(id: string) {
  const file = await getDb().mediaFile.findFirst({
    where: { id, deletedAt: null },
  });
  if (!file) throw new AdminServiceError("NOT_FOUND", "Файл не найден", 404);
  const expiresIn = 300;
  const { data, error } = await getStorage()
    .from(file.bucket)
    .createSignedUrl(file.path, expiresIn);
  if (error || !data.signedUrl)
    throw new AdminServiceError(
      "SIGNED_URL_FAILED",
      "Не удалось открыть файл",
      502,
    );
  return { url: data.signedUrl, expiresIn };
}
