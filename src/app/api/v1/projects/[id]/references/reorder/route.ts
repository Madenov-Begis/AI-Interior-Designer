import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { projectIdSchema } from "@/features/projects/schemas";
import { reorderReferencesSchema } from "@/features/references/schema";
import {
  ReferenceNotFoundError,
  reorderReferences,
} from "@/features/references/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body = reorderReferencesSchema.parse(await request.json());
    await reorderReferences(
      user.id,
      projectIdSchema.parse(id),
      body.referenceIds,
    );
    return apiSuccess({ referenceIds: body.referenceIds }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ReferenceNotFoundError)
      return apiError("REFERENCE_NOT_FOUND", error.message, requestId, 404);
    if (error instanceof ZodError)
      return apiError(
        "VALIDATION_ERROR",
        "Неверный порядок референсов",
        requestId,
        400,
        error.flatten(),
      );
    return apiError(
      "REFERENCE_REORDER_FAILED",
      "Не удалось изменить порядок",
      requestId,
      500,
    );
  }
}
