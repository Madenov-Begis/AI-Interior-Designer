import type { NextRequest } from "next/server";
import { paymentHttpError } from "@/features/payments/http";
import { paymentOrderIdSchema } from "@/features/payments/schema";
import { getOwnedPaymentOrder } from "@/features/payments/service";
import { paymentOrderSummary } from "@/features/payments/summary";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser } from "@/lib/auth/current-user";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const id = paymentOrderIdSchema.parse((await context.params).id);
    const order = await getOwnedPaymentOrder(user.id, id);
    return apiSuccess({ order: paymentOrderSummary(order) }, requestId);
  } catch (error) {
    const mapped = paymentHttpError(error);
    return apiError(
      mapped.code,
      mapped.message,
      requestId,
      mapped.status,
      mapped.details,
    );
  }
}
