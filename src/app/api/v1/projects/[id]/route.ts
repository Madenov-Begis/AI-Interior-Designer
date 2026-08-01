import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import {
  archiveOwnedProject,
  findOwnedProject,
  updateOwnedProject,
} from "@/features/projects/service";
import {
  projectIdSchema,
  updateProjectSchema,
} from "@/features/projects/schemas";

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const id = projectIdSchema.parse((await context.params).id);
    const input = updateProjectSchema.parse(await request.json());
    const project = await updateOwnedProject(user.id, id, input);
    return project
      ? apiSuccess(project, requestId)
      : apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError)
      return apiError(
        "VALIDATION_ERROR",
        "Проверьте введённые данные",
        requestId,
        422,
        error.flatten(),
      );
    return apiError(
      "INTERNAL_ERROR",
      "Не удалось обновить проект",
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
