import type { NextRequest } from "next/server";
import { handleMockOutcomePost } from "@/server/features/payments/route-handlers";
import { submitMockPaymentOutcome } from "@/server/features/payments/service";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser } from "@/server/features/auth/current-user";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  return handleMockOutcomePost(request, context, requestId, {
    requireCurrentUser,
    submitMockPaymentOutcome,
  });
}
