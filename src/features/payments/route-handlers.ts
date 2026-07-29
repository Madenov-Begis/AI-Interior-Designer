import type { PaymentOrder } from "../../generated/prisma/client.ts";
import { paymentHttpError } from "./http.ts";
import {
  mockOutcomeSchema,
  paymentOrderCreateSchema,
  paymentOrderIdSchema,
} from "./schema.ts";
import { paymentOrderSummary } from "./summary.ts";

type RouteUser = { id: string };

type CreatePaymentOrderDependencies = {
  requireCurrentUser(): Promise<RouteUser>;
  createPaymentOrder(
    userId: string,
    packageCode: string,
  ): Promise<{ order: PaymentOrder; checkoutUrl: string }>;
};

type MockOutcomeDependencies = {
  requireCurrentUser(): Promise<RouteUser>;
  submitMockPaymentOutcome(
    userId: string,
    orderId: string,
    outcome: "PAID" | "FAILED" | "CANCELLED",
  ): Promise<{ order: PaymentOrder; balance: number | null }>;
};

function jsonResponse(
  body: unknown,
  requestId: string,
  init?: ResponseInit,
) {
  const response = Response.json(body, init);
  response.headers.set("x-request-id", requestId);
  return response;
}

function paymentErrorResponse(error: unknown, requestId: string) {
  const mapped = paymentHttpError(error);
  const apiError =
    mapped.details === undefined
      ? { code: mapped.code, message: mapped.message }
      : {
          code: mapped.code,
          message: mapped.message,
          details: mapped.details,
        };
  return jsonResponse(
    { error: apiError, meta: { requestId } },
    requestId,
    { status: mapped.status },
  );
}

export async function handlePaymentOrderPost(
  request: Request,
  requestId: string,
  dependencies: CreatePaymentOrderDependencies,
) {
  try {
    const user = await dependencies.requireCurrentUser();
    const input = paymentOrderCreateSchema.parse(await request.json());
    const result = await dependencies.createPaymentOrder(
      user.id,
      input.packageCode,
    );
    return jsonResponse(
      {
        data: {
          order: paymentOrderSummary(result.order),
          checkoutUrl: result.checkoutUrl,
        },
        meta: { requestId },
      },
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return paymentErrorResponse(error, requestId);
  }
}

export async function handleMockOutcomePost(
  request: Request,
  context: { params: Promise<{ id: string }> },
  requestId: string,
  dependencies: MockOutcomeDependencies,
) {
  try {
    const user = await dependencies.requireCurrentUser();
    const id = paymentOrderIdSchema.parse((await context.params).id);
    const input = mockOutcomeSchema.parse(await request.json());
    const result = await dependencies.submitMockPaymentOutcome(
      user.id,
      id,
      input.outcome,
    );
    return jsonResponse(
      {
        data: {
          order: paymentOrderSummary(result.order),
          balance: result.balance,
        },
        meta: { requestId },
      },
      requestId,
    );
  } catch (error) {
    return paymentErrorResponse(error, requestId);
  }
}
