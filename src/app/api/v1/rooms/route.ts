import type { NextRequest } from "next/server";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import { listActiveRoomTypes } from "@/server/features/rooms/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { localeFromHeaders } from "@/server/shared/i18n/api-locale";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  const locale = localeFromHeaders(request.headers);
  try {
    await requireCurrentUser();
    const response = apiSuccess(
      { items: await listActiveRoomTypes(locale) },
      requestId,
    );
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    return error instanceof UnauthorizedError
      ? apiError("UNAUTHORIZED", error.message, requestId, 401)
      : apiError(
          "ROOM_CATALOG_FAILED",
          "Не удалось загрузить список комнат",
          requestId,
          500,
        );
  }
}
