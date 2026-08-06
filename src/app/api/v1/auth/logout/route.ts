import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { clearSessionCookies } from "@/server/shared/auth/session-cookies";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
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
