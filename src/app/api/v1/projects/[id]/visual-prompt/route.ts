import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { VISUAL_PROMPT_RULES } from "@/config/storage";
import { projectIdSchema } from "@/features/projects/schemas";
import { parseVisualPromptCanvasState, VisualPromptValidationError } from "@/features/visual-prompt/schema";
import { removeVisualPrompt, saveVisualPrompt, VisualPromptProjectNotFoundError } from "@/features/visual-prompt/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > VISUAL_PROMPT_RULES.maxOverlayBytes + 1024 * 1024) {
      return apiError("OVERLAY_TOO_LARGE", "Разметка превышает 15 МБ", requestId, 413);
    }

    const user = await requireCurrentUser();
    const { id } = await context.params;
    const projectId = projectIdSchema.parse(id);
    const formData = await request.formData();
    const overlay = formData.get("overlay");
    if (!(overlay instanceof File)) return apiError("OVERLAY_REQUIRED", "Разметка отсутствует", requestId, 400);
    const state = parseVisualPromptCanvasState(formData.get("canvasState"));
    const file = await saveVisualPrompt(user.id, projectId, overlay, state);
    return apiSuccess({ id: file.id, visualPromptUsed: true }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof VisualPromptProjectNotFoundError || error instanceof ZodError) return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    if (error instanceof VisualPromptValidationError) return apiError(error.code, error.message, requestId, 400);
    return apiError("VISUAL_PROMPT_SAVE_FAILED", "Не удалось сохранить разметку", requestId, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    await removeVisualPrompt(user.id, projectIdSchema.parse(id));
    return apiSuccess({ visualPromptUsed: false }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof VisualPromptProjectNotFoundError || error instanceof ZodError) return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    return apiError("VISUAL_PROMPT_DELETE_FAILED", "Не удалось восстановить оригинал", requestId, 500);
  }
}
