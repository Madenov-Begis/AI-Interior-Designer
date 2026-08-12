import { after, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { getSystemLimits } from "@/server/shared/config/system-limits";
import {
  GenerationClientPayloadError,
  getGenerationClientPayload,
} from "@/server/features/generations/client-payload";
import { GenerationReservationError } from "@/server/features/generations/operations";
import { rootReservationHttpStatus } from "@/server/features/generations/reservation-policy";
import { reserveRootGeneration } from "@/server/features/generations/reservation";
import { recoverExpiredGenerationReservations } from "@/server/features/generations/recovery";
import {
  createGenerationSchema,
  idempotencyKeySchema,
} from "@/server/features/generations/schema";
import { processGeneration } from "@/server/features/generations/worker";
import { projectIdSchema } from "@/server/features/projects/schemas";
import {
  parseVisualPromptCanvasState,
  VisualPromptValidationError,
} from "@/server/features/visual-prompt/schema";
import {
  discardUnattachedVisualPrompt,
  saveVisualPrompt,
  VisualPromptProjectNotFoundError,
} from "@/server/features/visual-prompt/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import { getDb } from "@/server/shared/db/prisma";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/server/shared/security/rate-limit";

const visualPromptInputSchema = z
  .object({
    action: z.enum(["replace", "clear"]),
    overlayPresent: z.boolean(),
    canvasStatePresent: z.boolean(),
  })
  .refine(
    ({ action, overlayPresent, canvasStatePresent }) =>
      action === "replace"
        ? overlayPresent && canvasStatePresent
        : !overlayPresent && !canvasStatePresent,
    { message: "Разметка и состояние холста должны быть переданы вместе" },
  );

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  let uploadOwnerId: string | null = null;
  let unattachedVisualPromptId: string | null = null;
  try {
    enforceRateLimit(request, "generation", 10, 60_000);
    const limits = getSystemLimits();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > limits.maxUploadSizeBytes + 1024 * 1024) {
      return apiError(
        "OVERLAY_TOO_LARGE",
        `Разметка превышает ${limits.maxUploadSizeMb} МБ`,
        requestId,
        413,
      );
    }

    const user = await requireCurrentUser();
    uploadOwnerId = user.id;
    await recoverExpiredGenerationReservations(user.id);
    const projectId = projectIdSchema.parse((await context.params).id);
    const idempotencyKey = idempotencyKeySchema.parse(
      request.headers.get("idempotency-key"),
    );

    const existing = await getDb().generation.findUnique({
      where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } },
      select: { id: true },
    });
    if (existing) {
      return generationResponse(user.id, existing.id, true, requestId);
    }

    const formData = await request.formData();
    const overlay = formData.get("overlay");
    const canvasState = formData.get("canvasState");
    const visualPrompt = visualPromptInputSchema.parse({
      action: formData.get("visualPromptAction"),
      overlayPresent: overlay instanceof File,
      canvasStatePresent: typeof canvasState === "string",
    });
    const input = createGenerationSchema.parse({
      projectId,
      prompt: formData.get("prompt"),
      aspectRatio: formData.get("aspectRatio"),
      styleCode: formData.get("styleCode") || undefined,
    });

    const parsedCanvasState =
      visualPrompt.action === "replace"
        ? parseVisualPromptCanvasState(canvasState)
        : undefined;
    if (visualPrompt.action === "replace" && overlay instanceof File) {
      const snapshot = await saveVisualPrompt(
        user.id,
        projectId,
        overlay,
        parsedCanvasState!,
        { attachToProject: false },
      );
      unattachedVisualPromptId = snapshot.id;
    }

    const reserved = await reserveRootGeneration({
      userId: user.id,
      ...input,
      visualPromptImageId: unattachedVisualPromptId,
      visualPromptCanvasState: parsedCanvasState,
      idempotencyKey,
    });
    if (reserved.isExisting && unattachedVisualPromptId) {
      await discardUnattachedVisualPrompt(user.id, unattachedVisualPromptId);
    }
    unattachedVisualPromptId = null;
    if (!reserved.isExisting && reserved.generation.status === "QUEUED") {
      after(() => processGeneration(reserved.generation.id));
    }
    return generationResponse(
      user.id,
      reserved.generation.id,
      reserved.isExisting,
      requestId,
    );
  } catch (error) {
    if (uploadOwnerId && unattachedVisualPromptId) {
      await discardUnattachedVisualPrompt(
        uploadOwnerId,
        unattachedVisualPromptId,
      ).catch(() => undefined);
    }
    if (error instanceof RateLimitError) {
      return apiError("RATE_LIMITED", error.message, requestId, 429);
    }
    if (error instanceof UnauthorizedError) {
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    }
    if (error instanceof GenerationReservationError) {
      return apiError(
        error.code,
        error.message,
        requestId,
        rootReservationHttpStatus(error.code),
      );
    }
    if (error instanceof VisualPromptProjectNotFoundError) {
      return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    }
    if (error instanceof ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Проверьте инструкцию, формат и разметку",
        requestId,
        400,
        error.flatten(),
      );
    }
    if (error instanceof VisualPromptValidationError) {
      return apiError(error.code, error.message, requestId, 400);
    }
    if (error instanceof GenerationClientPayloadError) {
      return apiError(
        error.code,
        error.message,
        requestId,
        error.code === "GENERATION_NOT_FOUND" ? 404 : 502,
      );
    }
    return apiError(
      "GENERATION_CREATE_FAILED",
      "Не удалось создать генерацию",
      requestId,
      500,
    );
  }
}

async function generationResponse(
  userId: string,
  generationId: string,
  isExisting: boolean,
  requestId: string,
) {
  const payload = await getGenerationClientPayload(userId, generationId);
  return apiSuccess(
    {
      ...payload,
      isExisting,
    },
    requestId,
    { status: isExisting ? 200 : 202 },
  );
}
