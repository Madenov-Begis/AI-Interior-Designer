import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/server/features/auth/current-user";
import {
  archiveOwnedProject,
  findOwnedProject,
} from "@/server/features/projects/service";
import { projectIdSchema } from "@/server/features/projects/schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const project = await findOwnedProject(user.id, projectIdSchema.parse(id));
    return project
      ? apiSuccess(
          {
            id: project.id,
            name: project.name,
            status: project.status,
            prompt: project.prompt,
            aspectRatio: project.aspectRatio,
            visualPromptUsed: project.visualPromptUsed,
            canvasState: project.canvasState,
            sourceImage: project.sourceImage
              ? {
                  id: project.sourceImage.id,
                  mimeType: project.sourceImage.mimeType,
                  sizeBytes: project.sourceImage.sizeBytes,
                  width: project.sourceImage.width,
                  height: project.sourceImage.height,
                }
              : null,
            sourcePreview: project.sourcePreview
              ? {
                  id: project.sourcePreview.id,
                  width: project.sourcePreview.width,
                  height: project.sourcePreview.height,
                }
              : null,
            references: project.references.map((reference) => ({
              id: reference.id,
              fileId: reference.fileId,
              sourceUrl: reference.sourceUrl,
              position: reference.position,
            })),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          },
          requestId,
        )
      : apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError)
      return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    return apiError(
      "INTERNAL_ERROR",
      "Не удалось получить проект",
      requestId,
      500,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const id = projectIdSchema.parse((await context.params).id);
    return (await archiveOwnedProject(user.id, id))
      ? apiSuccess({ deleted: true }, requestId)
      : apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    return apiError(
      "INTERNAL_ERROR",
      "Не удалось удалить проект",
      requestId,
      500,
    );
  }
}
