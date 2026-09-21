import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { projectIdSchema } from "@/server/features/projects/schemas";
import {
  getProjectWorkspace,
  ProjectWorkspaceNotFoundError,
} from "@/server/features/projects/workspace";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { localeFromHeaders } from "@/server/shared/i18n/api-locale";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const projectId = projectIdSchema.parse((await context.params).id);
    return apiSuccess(
      await getProjectWorkspace(
        user,
        projectId,
        localeFromHeaders(request.headers),
      ),
      requestId,
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    }
    if (
      error instanceof ProjectWorkspaceNotFoundError ||
      error instanceof ZodError
    ) {
      return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    }
    return apiError(
      "WORKSPACE_READ_FAILED",
      "Не удалось открыть рабочее пространство",
      requestId,
      500,
    );
  }
}
