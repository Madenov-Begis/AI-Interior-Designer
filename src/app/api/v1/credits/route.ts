import type { NextRequest } from "next/server";
import { CREDIT_PACKAGES, GENERATION_CREDIT_COST } from "@/server/shared/config/product";
import { getCreditWallet } from "@/server/features/credits/service";
import { paymentHttpError } from "@/server/features/payments/http";
import { apiError, apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";
import { requireCurrentUser } from "@/server/features/auth/current-user";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await requireCurrentUser();
    const wallet = await getCreditWallet(user.id);
    return apiSuccess(
      {
        balance: wallet.balance,
        generationCost: GENERATION_CREDIT_COST,
        packages: CREDIT_PACKAGES,
        paymentMode:
          process.env.PAYMENT_PROVIDER === "mock" ? "mock" : "disabled",
        transactions: wallet.transactions,
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
