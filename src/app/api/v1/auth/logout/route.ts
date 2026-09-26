import { cookies } from "next/headers";
import { allowedCookieOrigin } from "@/server/shared/security/cookie-origin";
import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { getDb } from "@/server/shared/db/prisma";
import { nativeSessionConfig } from "@/server/features/auth/native-config";
import { revokeNativeSession } from "@/server/features/auth/native-session-operations";
import {
  clearSessionCookies,
  REFRESH_TOKEN_COOKIE,
} from "@/server/shared/auth/session-cookies";

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
    const accessToken = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/i)?.[1];
    const refreshToken = (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
    await revokeNativeSession(
      getDb(),
      refreshToken,
      accessToken,
      nativeSessionConfig(),
    );
    await clearSessionCookies();
    return apiSuccess({ signedOut: true }, requestId, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return apiError(
      "LOGOUT_FAILED",
      "Не удалось завершить сессию",
      requestId,
      500,
    );
  }
}
