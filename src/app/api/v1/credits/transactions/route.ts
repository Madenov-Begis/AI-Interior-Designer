import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/server/features/auth/current-user";
import { listCreditTransactions } from "@/server/features/credits/service";
import { paymentHttpError } from "@/server/features/payments/http";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const items = await listCreditTransactions(user.id, 20);
    return apiSuccess({ items }, requestId);
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
