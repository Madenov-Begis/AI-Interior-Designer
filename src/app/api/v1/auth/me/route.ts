import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const profile = await getDb().profile.findUnique({
      where: { id: user.id },
      include: { plan: true },
    });
    return apiSuccess({ id: user.id, email: user.email, profile }, requestId);
  } catch (error) {
    return error instanceof UnauthorizedError
      ? apiError("UNAUTHORIZED", error.message, requestId, 401)
      : apiError(
          "INTERNAL_ERROR",
          "Не удалось получить сессию",
          requestId,
          500,
        );
  }
}
