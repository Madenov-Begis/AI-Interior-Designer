import { after, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { reserveRefinement } from "@/features/generations/reservation";
import { handleRefinementGenerationReservation } from "@/features/generations/route-handlers";
import {
  createRefinementSchema,
  idempotencyKeySchema,
  refinementVisualPromptPairSchema,
} from "@/features/generations/schema";
import { processGeneration } from "@/features/generations/worker";
import {
  parseVisualPromptCanvasState,
  VisualPromptValidationError,
} from "@/features/visual-prompt/schema";
import {
  saveGenerationRefinementVisualPrompt,
  VisualPromptProjectNotFoundError,
} from "@/features/visual-prompt/service";
import { apiError } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  try {
    enforceRateLimit(request, "generation-refinement", 10, 60_000);
    const user = await requireCurrentUser();
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
    const input = createRefinementSchema.parse({
      prompt: formData.get("prompt"),
      referenceFileIds:
        typeof referenceValue === "string" ? JSON.parse(referenceValue) : [],
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
    }

    return await handleRefinementGenerationReservation(
      {
        userId: user.id,
        parentGenerationId,
        prompt: input.prompt,
        referenceFileIds: input.referenceFileIds,
        visualPromptImageId,
        idempotencyKey,
      },
      requestId,
      {
        reserve: reserveRefinement,
        schedule: (generationId) =>
          after(() => processGeneration(generationId)),
      },
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return apiError("RATE_LIMITED", error.message, requestId, 429);
    }
    if (error instanceof UnauthorizedError) {
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
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
