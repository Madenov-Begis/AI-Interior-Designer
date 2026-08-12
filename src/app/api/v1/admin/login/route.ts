import type { NextRequest } from "next/server";
import { z } from "zod";
import { ADMIN_ACCESS_CODE_MIN_LENGTH } from "@/server/features/admin/admin-token";
import { loginAdminWithAccessCode } from "@/server/features/admin/auth-service";
import { adminApiError, parseAdminJson } from "@/server/features/admin/http";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { enforceRateLimit } from "@/server/shared/security/rate-limit";

const loginSchema = z.object({
  code: z.string().trim().min(ADMIN_ACCESS_CODE_MIN_LENGTH).max(128),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    enforceRateLimit(request, "admin-login", 5, 15 * 60_000);
    const input = loginSchema.parse(await parseAdminJson(request));
    const session = await loginAdminWithAccessCode(input.code);
    const response = apiSuccess(session, requestId);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось выполнить вход");
  }
}

