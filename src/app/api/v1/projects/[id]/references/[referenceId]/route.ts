import { type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { projectIdSchema } from "@/features/projects/schemas";
import {
  deleteReference,
  ReferenceNotFoundError,
} from "@/features/references/service";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

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
