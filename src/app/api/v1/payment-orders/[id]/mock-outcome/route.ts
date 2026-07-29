import type { NextRequest } from "next/server";
import { handleMockOutcomePost } from "@/features/payments/route-handlers";
import { submitMockPaymentOutcome } from "@/features/payments/service";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser } from "@/lib/auth/current-user";

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
