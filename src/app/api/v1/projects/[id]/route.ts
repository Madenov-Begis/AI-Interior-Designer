import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { findOwnedProject } from "@/features/projects/service";
import { projectIdSchema } from "@/features/projects/schemas";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const project = await findOwnedProject(user.id, projectIdSchema.parse(id));
    return project
      ? apiSuccess(project, requestId)
      : apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ZodError) return apiError("PROJECT_NOT_FOUND", "Проект не найден", requestId, 404);
    return apiError("INTERNAL_ERROR", "Не удалось получить проект", requestId, 500);
  }
}
