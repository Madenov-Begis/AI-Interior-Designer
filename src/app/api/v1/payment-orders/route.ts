import type { NextRequest } from "next/server";
import { paymentHttpError } from "@/features/payments/http";
import { paymentOrderCreateSchema } from "@/features/payments/schema";
import { createPaymentOrder } from "@/features/payments/service";
import { paymentOrderSummary } from "@/features/payments/summary";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser } from "@/lib/auth/current-user";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const input = paymentOrderCreateSchema.parse(await request.json());
    const result = await createPaymentOrder(user.id, input.packageCode);
    return apiSuccess(
      {
        order: paymentOrderSummary(result.order),
        checkoutUrl: result.checkoutUrl,
      },
      requestId,
      { status: 201 },
    );
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
