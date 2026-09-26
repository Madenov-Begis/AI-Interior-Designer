import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { allowedCookieOrigin } from "@/server/shared/security/cookie-origin";
import {
  clearSessionCookies,
  storeSessionCookies,
  REFRESH_TOKEN_COOKIE,
} from "@/server/shared/auth/session-cookies";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { getDb } from "@/server/shared/db/prisma";
import { nativeSessionConfig } from "@/server/features/auth/native-config";
import {
  refreshNativeSession,
  InvalidSessionError,
} from "@/server/features/auth/native-session-operations";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  try {
    if (!allowedCookieOrigin(request))
      return apiError(
        "FORBIDDEN",
        "Недопустимый источник запроса",
        requestId,
        403,
      );
    const refreshToken = (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken)
      return apiError(
        "INVALID_REFRESH_TOKEN",
        "Сессия истекла",
        requestId,
        401,
      );

    try {
      const session = await refreshNativeSession(
        getDb(),
        refreshToken,
        nativeSessionConfig(),
      );
      await storeSessionCookies(session);
      return apiSuccess(
        { accessToken: session.access_token, expiresIn: session.expires_in },
        requestId,
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (!(error instanceof InvalidSessionError)) throw error;
      await clearSessionCookies();
      return apiError(
        "INVALID_REFRESH_TOKEN",
        "Сессия истекла",
        requestId,
        401,
      );
    }
  } catch {
    return apiError(
      "AUTH_UNAVAILABLE",
      "Не удалось обновить сессию. Попробуйте позже",
      requestId,
      503,
    );
  }
}
