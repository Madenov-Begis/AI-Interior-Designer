import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { updateProfileSchema } from "@/features/profile/schema";
import { GENERATION_CREDIT_COST } from "@/config/product";
import { getCreditWallet } from "@/features/credits/service";
import { getTodayUsage } from "@/features/generations/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";

const profileSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  status: true,
  timezone: true,
  createdAt: true,
} as const;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const [profile, usage, wallet] = await Promise.all([
      getDb().profile.findUniqueOrThrow({
        where: { id: user.id },
        select: profileSelect,
      }),
      getTodayUsage(user.id),
      getCreditWallet(user.id, 0),
    ]);
    return apiSuccess(
      {
        profile,
        usage,
        wallet: {
          balance: wallet.balance,
          generationCost: GENERATION_CREDIT_COST,
        },
      },
      requestId,
    );
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    return apiError(
      "PROFILE_READ_FAILED",
      "Не удалось получить профиль",
      requestId,
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const input = updateProfileSchema.parse(await request.json());
    const profile = await getDb().profile.update({
      where: { id: user.id },
      data: input,
      select: profileSelect,
    });
    return apiSuccess({ profile }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError)
      return apiError(
        "VALIDATION_ERROR",
        "Проверьте имя",
        requestId,
        400,
        error.flatten(),
      );
    return apiError(
      "PROFILE_UPDATE_FAILED",
      "Не удалось обновить профиль",
      requestId,
      500,
    );
  }
}
