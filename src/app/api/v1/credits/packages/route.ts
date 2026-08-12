import type { NextRequest } from "next/server";
import { paymentHttpError } from "@/server/features/payments/http";
import { listActiveCreditPackages } from "@/server/features/payments/packages";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const packages = await listActiveCreditPackages();
    const response = apiSuccess(
      {
        items: packages,
        paymentMode:
          process.env.PAYMENT_PROVIDER === "mock" ? "mock" : "disabled",
      },
      requestId,
    );
    response.headers.set("cache-control", "no-store");
    return response;
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
