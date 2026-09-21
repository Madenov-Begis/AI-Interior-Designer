import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { listGenerationsSchema } from "@/server/features/generations/schema";
import { attachHistoryResultUrls } from "@/server/features/generations/history-media";
import { listOwnedGenerations } from "@/server/features/generations/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  localeFromHeaders,
  localizeGenerationMessage,
} from "@/server/shared/i18n/api-locale";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const input = listGenerationsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const generations = await listOwnedGenerations(user.id, input);
    const items = await attachHistoryResultUrls(
      generations.items,
      async (bucket, paths) => {
        const result = await getSupabaseAdmin()
          .storage.from(bucket)
          .createSignedUrls(paths, 600);
        if (result.error) return [];
        return result.data.flatMap((file) =>
          file.path && file.signedUrl
            ? [{ path: file.path, signedUrl: file.signedUrl }]
            : [],
        );
      },
    );
    const locale = localeFromHeaders(request.headers);
    return apiSuccess(
      {
        ...generations,
        items: items.map((item) => ({
          ...item,
          errorMessage: localizeGenerationMessage(
            locale,
            item.errorCode,
            item.errorMessage,
          ),
        })),
      },
      requestId,
    );
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError)
      return apiError(
        "VALIDATION_ERROR",
        "Некорректные фильтры истории",
        requestId,
        400,
        error.flatten(),
      );
    return apiError(
      "HISTORY_READ_FAILED",
      "Не удалось получить историю",
      requestId,
      500,
    );
  }
}
