import { isRetryableAuthFailure } from "@/server/features/auth/refresh-policy";
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
import { createSupabaseTokenClient } from "@/server/shared/integrations/supabase/token-client";

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

    const { data, error } =
      await createSupabaseTokenClient().auth.refreshSession({
        refresh_token: refreshToken,
      });
    if (error || !data.session) {
      if (error && isRetryableAuthFailure(error))
        return apiError(
          "AUTH_UNAVAILABLE",
          "Не удалось обновить сессию. Попробуйте позже",
          requestId,
          503,
        );
      await clearSessionCookies();
      return apiError("REFRESH_FAILED", "Сессия истекла", requestId, 401);
    }

    await storeSessionCookies(data.session);
    const response = apiSuccess(
      {
        accessToken: data.session.access_token,
        expiresIn: data.session.expires_in,
      },
      requestId,
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return apiError(
      "AUTH_UNAVAILABLE",
      "Не удалось обновить сессию. Попробуйте позже",
      requestId,
      503,
    );
  }
}
