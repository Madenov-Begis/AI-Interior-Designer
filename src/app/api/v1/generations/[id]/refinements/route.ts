import { after, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  GenerationClientPayloadError,
  getGenerationClientPayload,
} from "@/server/features/generations/client-payload";
import { GenerationReservationError } from "@/server/features/generations/operations";
import { reserveRefinement } from "@/server/features/generations/reservation";
import { recoverExpiredGenerationReservations } from "@/server/features/generations/recovery";
import { refinementReservationHttpStatus } from "@/server/features/generations/reservation-policy";
import {
  createRefinementSchema,
  idempotencyKeySchema,
  refinementVisualPromptPairSchema,
} from "@/server/features/generations/schema";
import { processGeneration } from "@/server/features/generations/worker";
import {
  RefinementParentNotFoundError,
  RefinementReferenceLimitError,
  uploadRefinementReferences,
} from "@/server/features/generations/refinement";
import { ImageValidationError } from "@/server/features/media/image-validation";
import { deleteMediaFileIfUnreferenced } from "@/server/features/media/cleanup";
import { getSystemLimits } from "@/server/shared/config/system-limits";
import {
  parseVisualPromptCanvasState,
  VisualPromptValidationError,
} from "@/server/features/visual-prompt/schema";
import {
  discardUnattachedVisualPrompt,
  saveGenerationRefinementVisualPrompt,
  VisualPromptProjectNotFoundError,
} from "@/server/features/visual-prompt/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/server/shared/security/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  let uploadOwnerId: string | null = null;
  let unattachedVisualPromptId: string | null = null;
  let unattachedReferenceIds: string[] = [];
  try {
    enforceRateLimit(request, "generation-refinement", 10, 60_000);
    const limits = getSystemLimits();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    const maximumBodySize =
      limits.maxUploadSizeBytes * (limits.maxReferenceImages + 1) +
      1024 * 1024;
    if (contentLength > maximumBodySize) {
      return apiError(
        "FILE_TOO_LARGE",
        "Общий размер файлов слишком велик",
        requestId,
        413,
      );
    }
    const user = await requireCurrentUser();
    uploadOwnerId = user.id;
    await recoverExpiredGenerationReservations(user.id);
    const parentGenerationId = z.uuid().parse((await context.params).id);
    const idempotencyKey = idempotencyKeySchema.parse(
      request.headers.get("idempotency-key"),
    );
    const formData = await request.formData();
    const overlay = formData.get("overlay");
    const canvasStateValue = formData.get("canvasState");
    refinementVisualPromptPairSchema.parse({
      overlayPresent: overlay instanceof File,
      canvasStatePresent: typeof canvasStateValue === "string",
    });
    const referenceValue = formData.get("referenceFileIds");
    const referenceFiles = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);
    const existingInput = createRefinementSchema.parse({
      prompt: formData.get("prompt"),
      referenceFileIds:
        typeof referenceValue === "string" ? JSON.parse(referenceValue) : [],
    });
    if (
      existingInput.referenceFileIds.length + referenceFiles.length >
      limits.maxReferenceImages
    ) {
      throw new RefinementReferenceLimitError(
        `Можно добавить не более ${limits.maxReferenceImages} референсов`,
      );
    }
    const uploadedReferences = referenceFiles.length
      ? await uploadRefinementReferences(
          user.id,
          parentGenerationId,
          referenceFiles,
        )
      : [];
    unattachedReferenceIds = uploadedReferences.map(
      (reference) => reference.fileId,
    );
    const input = createRefinementSchema.parse({
      prompt: existingInput.prompt,
      referenceFileIds: [
        ...existingInput.referenceFileIds,
        ...unattachedReferenceIds,
      ],
    });

    let visualPromptImageId: string | undefined;
    if (overlay instanceof File) {
      const state = parseVisualPromptCanvasState(canvasStateValue);
      const visualPrompt = await saveGenerationRefinementVisualPrompt(
        user.id,
        parentGenerationId,
        overlay,
        state,
      );
      visualPromptImageId = visualPrompt.id;
      unattachedVisualPromptId = visualPrompt.id;
    }

    const reserved = await reserveRefinement({
      userId: user.id,
      parentGenerationId,
      prompt: input.prompt,
      referenceFileIds: input.referenceFileIds,
      visualPromptImageId,
      idempotencyKey,
    });
    if (reserved.isExisting && unattachedVisualPromptId) {
      await discardUnattachedVisualPrompt(user.id, unattachedVisualPromptId);
    }
    if (reserved.isExisting && unattachedReferenceIds.length > 0) {
      await Promise.all(
        unattachedReferenceIds.map((fileId) =>
          deleteMediaFileIfUnreferenced(user.id, fileId),
        ),
      );
    }
    unattachedVisualPromptId = null;
    unattachedReferenceIds = [];
    if (!reserved.isExisting && reserved.generation.status === "QUEUED") {
      after(() => processGeneration(reserved.generation.id));
    }
    const payload = await getGenerationClientPayload(
      user.id,
      reserved.generation.id,
    );
    return apiSuccess(
      {
        ...payload,
        parentGenerationId,
        isExisting: reserved.isExisting,
      },
      requestId,
      { status: reserved.isExisting ? 200 : 202 },
    );
  } catch (error) {
    if (uploadOwnerId && unattachedVisualPromptId) {
      await discardUnattachedVisualPrompt(
        uploadOwnerId,
        unattachedVisualPromptId,
      ).catch(() => undefined);
    }
    if (uploadOwnerId && unattachedReferenceIds.length > 0) {
      await Promise.all(
        unattachedReferenceIds.map((fileId) =>
          deleteMediaFileIfUnreferenced(uploadOwnerId!, fileId).catch(
            () => undefined,
          ),
        ),
      );
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
        refinementReservationHttpStatus(error.code),
      );
    }
    if (error instanceof GenerationClientPayloadError) {
      return apiError(
        error.code,
        error.message,
        requestId,
        error.code === "GENERATION_NOT_FOUND" ? 404 : 502,
      );
    }
    if (error instanceof VisualPromptProjectNotFoundError) {
      return apiError(
        "GENERATION_NOT_FOUND",
        "Результат не найден",
        requestId,
        404,
      );
    }
    if (error instanceof VisualPromptValidationError) {
      return apiError(error.code, error.message, requestId, 400);
    }
    if (error instanceof RefinementParentNotFoundError) {
      return apiError(
        "GENERATION_NOT_FOUND",
        "Результат не найден",
        requestId,
        404,
      );
    }
    if (error instanceof RefinementReferenceLimitError) {
      return apiError(
        "REFERENCE_LIMIT_EXCEEDED",
        error.message,
        requestId,
        400,
      );
    }
    if (error instanceof ImageValidationError) {
      return apiError(error.code, error.message, requestId, 400);
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return apiError(
        "VALIDATION_ERROR",
        "Проверьте уточнение и референсы",
        requestId,
        400,
      );
    }
    return apiError(
      "REFINEMENT_CREATE_FAILED",
      "Не удалось создать доработку",
      requestId,
      500,
    );
  }
}
