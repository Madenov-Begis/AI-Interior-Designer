import type { NextRequest } from "next/server";
import { getOrCreateEntryProject } from "@/server/features/projects/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/server/features/auth/current-user";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const project = await getOrCreateEntryProject(user.id);
    return apiSuccess({ projectId: project.id }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    }
    return apiError(
      "PROJECT_ENTRY_FAILED",
      "Не удалось открыть проект",
      requestId,
      500,
    );
  }
}
