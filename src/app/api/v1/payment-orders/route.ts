import type { NextRequest } from "next/server";
import { handlePaymentOrderPost } from "@/server/features/payments/route-handlers";
import { createPaymentOrder } from "@/server/features/payments/service";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser } from "@/server/features/auth/current-user";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  return handlePaymentOrderPost(request, requestId, {
    requireCurrentUser,
    createPaymentOrder,
  });
}
