import type { NextRequest } from "next/server";
import { paymentHttpError } from "@/features/payments/http";
import {
  mockOutcomeSchema,
  paymentOrderIdSchema,
} from "@/features/payments/schema";
import { submitMockPaymentOutcome } from "@/features/payments/service";
import { paymentOrderSummary } from "@/features/payments/summary";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireCurrentUser } from "@/lib/auth/current-user";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const id = paymentOrderIdSchema.parse((await context.params).id);
    const input = mockOutcomeSchema.parse(await request.json());
    const result = await submitMockPaymentOutcome(
      user.id,
      id,
      input.outcome,
    );
    return apiSuccess(
      {
        order: paymentOrderSummary(result.order),
        balance: result.balance,
      },
      requestId,
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
