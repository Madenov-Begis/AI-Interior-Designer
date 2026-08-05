"use client";

import { AlertCircle, Ban, CheckCircle2, CreditCard } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/client/shared/components/ui/badge";
import { Button, buttonClassName } from "@/client/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/shared/components/ui/card";
import { Skeleton } from "@/client/shared/components/ui/skeleton";
import { refreshCreditsQuery } from "@/client/features/credits/client";
import {
  type CheckoutStatus,
  checkoutControlsDisabled,
  checkoutPresentation,
  checkoutTerminalMessageClassName,
  formatUzs,
} from "@/client/features/credits/presentation";
import {
  CheckoutReconciliationError,
  reconcileCheckoutOutcome,
} from "@/client/features/payments/checkout-reconciliation";
import { apiData } from "@/client/shared/api/client";

type PaymentOrder = {
  id: string;
  status: CheckoutStatus;
  packageCode: string;
  packageName: string;
  credits: number;
  amountUzs: number;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaymentOrderPayload = {
  order: PaymentOrder;
  balance: number | null;
};

type MockOutcome = "PAID" | "FAILED" | "CANCELLED";

const paymentOrderQueryKey = (orderId: string) =>
  ["payment-order", orderId] as const;

async function loadOwnedPaymentOrder(orderId: string) {
  return apiData<PaymentOrderPayload>({
    url: `/payment-orders/${orderId}`,
    method: "GET",
  });
}

const checkoutStatusLabels: Record<CheckoutStatus, string> = {
  PENDING: "Ожидает решения",
  PAID: "Оплачено",
  FAILED: "Ошибка оплаты",
  CANCELLED: "Оплата отменена",
  EXPIRED: "Время истекло",
};

export function MockCheckout({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const queryKey = paymentOrderQueryKey(orderId);
  const orderQuery = useQuery({
    queryKey,
    queryFn: () => loadOwnedPaymentOrder(orderId),
  });
  const outcome = useMutation({
    mutationFn: async (selectedOutcome: MockOutcome) =>
      reconcileCheckoutOutcome({
        submitOutcome: async () =>
          apiData({
            url: `/payment-orders/${orderId}/mock-outcome`,
            method: "POST",
            data: { outcome: selectedOutcome },
          }),
        readOwnedOrder: () =>
          queryClient.fetchQuery({
            queryKey,
            queryFn: () => loadOwnedPaymentOrder(orderId),
            staleTime: 0,
          }),
      }),
    onSuccess: async (result) => {
      if (result.order.status === "PAID") {
        await refreshCreditsQuery(queryClient);
      }
    },
  });

  if (orderQuery.isLoading) {
    return <Skeleton className="mx-auto min-h-[430px] max-w-xl rounded-xl" />;
  }
  if (!orderQuery.data) {
    return (
      <Card className="mx-auto max-w-xl border-destructive/30">
        <CardContent className="p-5 text-sm text-destructive" role="alert">
          {orderQuery.error?.message ?? "Не удалось загрузить заказ"}
        </CardContent>
      </Card>
    );
  }

  const order = orderQuery.data.order;
  const result = checkoutPresentation(order.status, orderQuery.data.balance);
  const reconciliationUnresolved =
    outcome.error instanceof CheckoutReconciliationError;
  const controlsDisabled = checkoutControlsDisabled(order.status, {
    requestPending: outcome.isPending,
    reconciliationUnresolved,
  });
  const outcomeError = outcome.error ?? outcome.data?.submissionError;

  return (
    <Card className="mx-auto max-w-xl overflow-hidden">
      <CardHeader className="border-b border-border bg-secondary/35">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="warning">Тестовый режим оплаты</Badge>
          <Badge variant={order.status === "PAID" ? "success" : "secondary"}>
            {checkoutStatusLabels[order.status]}
          </Badge>
        </div>
        <CardTitle className="pt-4">Проверка тестовой оплаты</CardTitle>
        <CardDescription>
          Реальные деньги не списываются. Выберите исход тестового заказа.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <dl className="grid gap-4 rounded-xl border border-border bg-secondary/25 p-4">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Пакет</dt>
            <dd className="text-right text-sm font-semibold">
              {order.packageName}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Кредиты</dt>
            <dd className="text-right text-sm font-semibold tabular-nums">
              {order.credits}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
            <dt className="text-sm text-muted-foreground">К оплате</dt>
            <dd className="text-right font-mono text-lg font-semibold tabular-nums">
              {formatUzs(order.amountUzs)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-3">
          <Button
            className="min-h-11 w-full"
            disabled={controlsDisabled}
            onClick={() => outcome.mutate("PAID")}
            aria-label="Симулировать успешную оплату"
          >
            <CheckCircle2 className="size-4" />
            Симулировать успешную оплату
          </Button>
          <Button
            variant="destructive"
            className="min-h-11 w-full"
            disabled={controlsDisabled}
            onClick={() => outcome.mutate("FAILED")}
            aria-label="Симулировать ошибку оплаты"
          >
            <AlertCircle className="size-4" />
            Симулировать ошибку
          </Button>
          <Button
            variant="outline"
            className="min-h-11 w-full"
            disabled={controlsDisabled}
            onClick={() => outcome.mutate("CANCELLED")}
            aria-label="Отменить тестовую оплату"
          >
            <Ban className="size-4" />
            Отменить оплату
          </Button>
        </div>

        <div className="mt-5 min-h-12" aria-live="polite">
          {outcome.isPending ? (
            <p className="text-sm text-muted-foreground">
              Обрабатываем тестовый результат…
            </p>
          ) : null}
          {outcomeError ? (
            <p className="text-sm text-destructive" role="alert">
              {outcomeError.message}
            </p>
          ) : null}
          {result.message ? (
            <p className={checkoutTerminalMessageClassName(order.status)}>
              {result.message}
            </p>
          ) : null}
        </div>

        {result.destination ? (
          <Link
            href={result.destination.href}
            prefetch={false}
            className={buttonClassName("outline", "mt-3 min-h-11 w-full")}
          >
            <CreditCard className="size-4" />
            {result.destination.label}
          </Link>
        ) : (
          <Link
            href="/app/credits"
            prefetch={false}
            className={buttonClassName(
              "ghost",
              "mt-3 min-h-11 w-full text-muted-foreground",
            )}
          >
            Вернуться к пакетам
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
