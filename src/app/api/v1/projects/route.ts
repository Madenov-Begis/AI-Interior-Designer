import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { createProject, listProjects } from "@/features/projects/service";
import { createProjectSchema, listProjectsSchema } from "@/features/projects/schemas";

function routeError(error: unknown, requestId: string) {
  if (error instanceof UnauthorizedError) return apiError("UNAUTHORIZED", error.message, requestId, 401);
  if (error instanceof ZodError) return apiError("VALIDATION_ERROR", "Проверьте входные данные", requestId, 400, error.flatten());
  return apiError("INTERNAL_ERROR", "Не удалось выполнить запрос", requestId, 500);
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const input = createProjectSchema.parse(await request.json());
    return apiSuccess(await createProject(user.id, input.name), requestId, { status: 201 });
  } catch (error) {
    return routeError(error, requestId);
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const query = listProjectsSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return apiSuccess(await listProjects(user.id, query.limit, query.cursor), requestId);
  } catch (error) {
    return routeError(error, requestId);
  }
}
