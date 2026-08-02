import type { NextRequest } from "next/server";
import { getOrCreateEntryProject } from "@/features/projects/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

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
