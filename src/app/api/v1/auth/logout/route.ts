import { cookies } from "next/headers";
import { allowedCookieOrigin } from "@/server/shared/security/cookie-origin";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";
import { createSupabaseTokenClient } from "@/server/shared/integrations/supabase/token-client";
import { isRetryableAuthFailure } from "@/server/features/auth/refresh-policy";
import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
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
    let accessToken = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/i)?.[1];
    const refreshToken = (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
    if (refreshToken) {
      const { data, error } =
        await createSupabaseTokenClient().auth.refreshSession({
          refresh_token: refreshToken,
        });
      if (error && isRetryableAuthFailure(error)) throw error;
      accessToken = data.session?.access_token ?? accessToken;
    }
    if (accessToken) {
      const { error } = await getSupabaseAdmin().auth.admin.signOut(
        accessToken,
        "local",
      );
      if (
        error &&
        error.status !== 401 &&
        error.status !== 403 &&
        error.status !== 404
      )
        throw error;
    }
    await clearSessionCookies();
    return apiSuccess({ signedOut: true }, requestId);
  } catch {
    return apiError(
      "LOGOUT_FAILED",
      "Не удалось завершить сессию",
      requestId,
      500,
    );
  }
}
