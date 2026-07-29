import type { NextRequest } from "next/server";
import { handlePaymentOrderPost } from "@/features/payments/route-handlers";
import { createPaymentOrder } from "@/features/payments/service";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser } from "@/lib/auth/current-user";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  return handlePaymentOrderPost(request, requestId, {
    requireCurrentUser,
    createPaymentOrder,
  });
}
