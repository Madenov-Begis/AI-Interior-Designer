import type { NextRequest } from "next/server";
import { clearSessionCookies } from "@/server/shared/auth/session-cookies";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { createSupabaseTokenClient } from "@/server/shared/integrations/supabase/token-client";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  try {
    const body = (await request.json()) as { refreshToken?: unknown };
    if (typeof body.refreshToken !== "string" || !body.refreshToken) {
      await clearSessionCookies();
      return apiError(
        "INVALID_REFRESH_TOKEN",
        "Сессия истекла",
        requestId,
        401,
      );
    }

    const { data, error } =
      await createSupabaseTokenClient().auth.refreshSession({
        refresh_token: body.refreshToken,
      });
    if (error || !data.session) {
      await clearSessionCookies();
      return apiError("REFRESH_FAILED", "Сессия истекла", requestId, 401);
    }

    const response = apiSuccess(
      {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      },
      requestId,
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    await clearSessionCookies();
    return apiError("REFRESH_FAILED", "Сессия истекла", requestId, 401);
  }
}
