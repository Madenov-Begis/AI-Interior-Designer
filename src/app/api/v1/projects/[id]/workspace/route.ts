import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { projectIdSchema } from "@/features/projects/schemas";
import {
  getProjectWorkspace,
  ProjectWorkspaceNotFoundError,
} from "@/features/projects/workspace";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const projectId = projectIdSchema.parse((await context.params).id);
    return apiSuccess(await getProjectWorkspace(user, projectId), requestId);
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
