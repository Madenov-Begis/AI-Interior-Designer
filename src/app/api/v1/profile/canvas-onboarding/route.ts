import { type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { getDb } from "@/server/shared/db/prisma";

const CANVAS_ONBOARDING_VERSION = 1;
const completeCanvasOnboardingSchema = z.object({
  version: z.literal(CANVAS_ONBOARDING_VERSION),
});

const onboardingSelect = {
  canvasOnboardingVersion: true,
  canvasOnboardingCompletedAt: true,
} as const;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  try {
    const user = await requireCurrentUser();
    const profile = await getDb().profile.findUniqueOrThrow({
      where: { id: user.id },
      select: onboardingSelect,
    });

    return apiSuccess({ onboarding: profile }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    }
    return apiError(
      "CANVAS_ONBOARDING_READ_FAILED",
      "Не удалось получить статус знакомства с холстом",
      requestId,
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  try {
    const user = await requireCurrentUser();
    const input = completeCanvasOnboardingSchema.parse(await request.json());
    const profile = await getDb().profile.update({
      where: { id: user.id },
      data: {
        canvasOnboardingVersion: input.version,
        canvasOnboardingCompletedAt: new Date(),
      },
      select: onboardingSelect,
    });

    return apiSuccess({ onboarding: profile }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    }
    if (error instanceof ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Некорректная версия знакомства с холстом",
        requestId,
        400,
        error.flatten(),
      );
    }
    return apiError(
      "CANVAS_ONBOARDING_UPDATE_FAILED",
      "Не удалось сохранить знакомство с холстом",
      requestId,
      500,
    );
  }
}
