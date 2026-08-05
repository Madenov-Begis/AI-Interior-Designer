import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/server/features/auth/current-user";
import { getDb } from "@/server/shared/db/prisma";

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
