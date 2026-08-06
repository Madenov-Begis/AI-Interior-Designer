import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/server/features/auth/current-user";
import { paymentHttpError } from "@/server/features/payments/http";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { CREDIT_PACKAGES } from "@/server/shared/config/product";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireCurrentUser();
    return apiSuccess(
      {
        items: CREDIT_PACKAGES,
        paymentMode:
          process.env.PAYMENT_PROVIDER === "mock" ? "mock" : "disabled",
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
