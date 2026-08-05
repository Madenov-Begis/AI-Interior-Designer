import { type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { projectIdSchema } from "@/server/features/projects/schemas";
import {
  deleteReference,
  ReferenceNotFoundError,
} from "@/server/features/references/service";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/server/features/auth/current-user";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; referenceId: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const { id, referenceId } = await context.params;
    await deleteReference(
      user.id,
      projectIdSchema.parse(id),
      z.uuid().parse(referenceId),
    );
    return apiSuccess({ id: referenceId }, requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHORIZED", error.message, requestId, 401);
    if (error instanceof ReferenceNotFoundError || error instanceof ZodError)
      return apiError(
        "REFERENCE_NOT_FOUND",
        "Референс не найден",
        requestId,
        404,
      );
    return apiError(
      "REFERENCE_DELETE_FAILED",
      "Не удалось удалить референс",
      requestId,
      500,
    );
  }
}
