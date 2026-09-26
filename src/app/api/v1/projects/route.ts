import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import {
  requireCurrentUser,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import {
  createProject,
  listProjects,
} from "@/server/features/projects/service";
import {
  createProjectSchema,
  listProjectsSchema,
} from "@/server/features/projects/schemas";
import { getStorage } from "@/server/shared/storage";

function routeError(error: unknown, requestId: string) {
  if (error instanceof UnauthorizedError)
    return apiError("UNAUTHORIZED", error.message, requestId, 401);
  if (error instanceof ZodError)
    return apiError(
      "VALIDATION_ERROR",
      "Проверьте входные данные",
      requestId,
      400,
      error.flatten(),
    );
  return apiError(
    "INTERNAL_ERROR",
    "Не удалось выполнить запрос",
    requestId,
    500,
  );
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const input = createProjectSchema.parse(await request.json());
    return apiSuccess(await createProject(user.id, input.name), requestId, {
      status: 201,
    });
  } catch (error) {
    return routeError(error, requestId);
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const query = listProjectsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const projects = await listProjects(
      user.id,
      query.limit,
      query.cursor,
      query.page,
      query.search,
    );
    const items = await Promise.all(
      projects.items.map(async (project) => {
        const media =
          project.generations[0]?.resultOriginal ?? project.sourcePreview;
        let previewUrl: string | null = null;
        if (media) {
          const signed = await getStorage()
            .from(media.bucket)
            .createSignedUrl(media.path, 600);
          previewUrl = signed.data?.signedUrl ?? null;
        }
        return {
          id: project.id,
          name: project.name,
          status: project.status,
          aspectRatio: project.aspectRatio,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          previewUrl,
          previewWidth: media?.width ?? null,
          previewHeight: media?.height ?? null,
          generationCount: project._count.generations,
        };
      }),
    );
    return apiSuccess(
      {
        items,
        nextCursor: projects.nextCursor,
        page: projects.page,
        pageCount: projects.pageCount,
        total: projects.total,
      },
      requestId,
    );
  } catch (error) {
    return routeError(error, requestId);
  }
}
