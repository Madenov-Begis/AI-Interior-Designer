import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { updateProfileSchema } from "@/server/features/profile/schema";
import { getGenerationUsage } from "@/server/features/generations/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import { getDb } from "@/server/shared/db/prisma";

const profileSelect = {
  email: true,
  displayName: true,
} as const;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const [profile, usage] = await Promise.all([
      getDb().profile.findUniqueOrThrow({
        where: { id: user.id },
        select: profileSelect,
      }),
      getGenerationUsage(user.id),
    ]);
    if (!usage) throw new Error("PROFILE_NOT_FOUND");
    return apiSuccess(
      {
        profile,
        usage: {
          used: usage.used,
          plan: { name: usage.plan.name },
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
