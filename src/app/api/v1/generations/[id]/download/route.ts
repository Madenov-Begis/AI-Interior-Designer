import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { generationIdSchema } from "@/features/generations/schema";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const generation = await getDb().generation.findFirst({
      where: { id: generationIdSchema.parse(id), userId: user.id, status: "SUCCEEDED", deletedAt: null },
      include: { resultUser: true },
    });
    if (!generation?.resultUser) return apiError("GENERATION_NOT_FOUND", "Результат не найден", requestId, 404);
    const downloaded = await getSupabaseAdmin().storage.from(generation.resultUser.bucket).download(generation.resultUser.path);
    if (downloaded.error || !downloaded.data) return apiError("DOWNLOAD_FAILED", "Не удалось скачать результат", requestId, 502);
    const filename = `interior-design-${generation.createdAt.toISOString().slice(0, 10)}.webp`;
    return new Response(downloaded.data, { headers: { "content-type": generation.resultUser.mimeType, "content-disposition": `attachment; filename="${filename}"`, "cache-control": "private, no-store", "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError) return apiError("GENERATION_NOT_FOUND", "Результат не найден", requestId, 404);
    return apiError("DOWNLOAD_FAILED", "Не удалось скачать результат", requestId, 500);
  }
}
