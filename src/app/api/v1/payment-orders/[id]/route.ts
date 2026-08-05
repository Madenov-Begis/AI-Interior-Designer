import type { NextRequest } from "next/server";
import { getCreditWallet } from "@/server/features/credits/service";
import { handlePaymentOrderGet } from "@/server/features/payments/route-handlers";
import { getOwnedPaymentOrder } from "@/server/features/payments/service";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser } from "@/server/features/auth/current-user";

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
