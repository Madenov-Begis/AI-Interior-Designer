import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import { getCreditBalance } from "@/server/features/credits/service";
import { GENERATION_CREDIT_COST } from "@/server/shared/config/product";
import { getDb } from "@/server/shared/db/prisma";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const [profile, balance] = await Promise.all([
      getDb().profile.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
        },
      }),
      getCreditBalance(user.id),
    ]);
    const email = profile.email ?? user.email ?? "";
    const name =
      profile.displayName?.trim() ||
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "Пользователь";

    return apiSuccess(
      {
        user: {
          id: user.id,
          name,
          email,
          avatarUrl: profile.avatarUrl,
        },
        wallet: {
          balance,
          generationCost: GENERATION_CREDIT_COST,
        },
      },
      requestId,
    );
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
