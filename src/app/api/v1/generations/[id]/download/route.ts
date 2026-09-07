import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { generationDownloadFilename } from "@/server/features/generations/generation-download";
import { generationIdSchema } from "@/server/features/generations/schema";
import { getDb } from "@/server/shared/db/prisma";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const generation = await getDb().generation.findFirst({
      where: {
        id: generationIdSchema.parse(id),
        userId: user.id,
        status: "SUCCEEDED",
        deletedAt: null,
      },
      include: { resultOriginal: true },
    });
    if (!generation?.resultOriginal)
      return apiError(
        "GENERATION_NOT_FOUND",
        "Результат не найден",
        requestId,
        404,
      );
    const filename = generationDownloadFilename(
      generation.createdAt,
      generation.resultOriginal.mimeType,
    );
    // Existing clients still request a binary attachment. New clients explicitly
    // request a signed URL so large files never cross the Function response limit.
    if (request.nextUrl.searchParams.get("signed") !== "1") {
      if (generation.resultOriginal.sizeBytes > 4 * 1024 * 1024)
        return apiError(
          "CLIENT_UPDATE_REQUIRED",
          "Обновите страницу, чтобы скачать большой файл",
          requestId,
          409,
        );
      const downloaded = await getSupabaseAdmin()
        .storage.from(generation.resultOriginal.bucket)
        .download(generation.resultOriginal.path);
      if (downloaded.error || !downloaded.data)
        return apiError(
          "DOWNLOAD_FAILED",
          "Не удалось скачать результат",
          requestId,
          502,
        );
      return new Response(await downloaded.data.arrayBuffer(), {
        headers: {
          "content-type": generation.resultOriginal.mimeType,
          "content-disposition": `attachment; filename="${filename}"`,
          "cache-control": "private, no-store",
          "x-request-id": requestId,
        },
      });
    }
    const signed = await getSupabaseAdmin()
      .storage.from(generation.resultOriginal.bucket)
      .createSignedUrl(generation.resultOriginal.path, 60, {
        download: filename,
      });
    if (signed.error || !signed.data?.signedUrl)
      return apiError(
        "DOWNLOAD_FAILED",
        "Не удалось скачать результат",
        requestId,
        502,
      );
    return apiSuccess(
      {
        url: signed.data.signedUrl,
        filename,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      requestId,
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError)
      return apiError(
        "GENERATION_NOT_FOUND",
        "Результат не найден",
        requestId,
        404,
      );
    return apiError(
      "DOWNLOAD_FAILED",
      "Не удалось скачать результат",
      requestId,
      500,
    );
  }
}
