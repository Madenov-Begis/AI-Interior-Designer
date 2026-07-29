import type { NextRequest } from "next/server";
import { getCreditWallet } from "@/features/credits/service";
import { handlePaymentOrderGet } from "@/features/payments/route-handlers";
import { getOwnedPaymentOrder } from "@/features/payments/service";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser } from "@/lib/auth/current-user";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  return handlePaymentOrderGet(context, requestId, {
    requireCurrentUser,
    getOwnedPaymentOrder,
    getCreditBalance: async (userId) =>
      (await getCreditWallet(userId, 0)).balance,
  });
}
