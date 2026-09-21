"use client";

import { AlertCircle, Ban, CheckCircle2, CreditCard } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { Badge } from "@/shared/ui";
import {
  Button,
  buttonClassName,
  LoadingButton,
  LoadingRegion,
} from "@/shared/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";
import { Skeleton } from "@/shared/ui";
import { refreshAppSession } from "@/features/auth/index.client";
import { CREDIT_TRANSACTIONS_QUERY_KEY } from "../api/client.ts";
import {
  type CheckoutStatus,
  checkoutControlsDisabled,
  checkoutPresentation,
  checkoutTerminalMessageClassName,
} from "../model/presentation.ts";
import {
  CheckoutReconciliationError,
  reconcileCheckoutOutcome,
} from "../model/checkout-reconciliation.ts";
import { apiData } from "@/shared/api";
import { useAppText } from "@/shared/providers";

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
  const locale = useLocale();
  const t = useAppText();
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
        await Promise.all([
          refreshAppSession(queryClient),
          queryClient.invalidateQueries({
            queryKey: CREDIT_TRANSACTIONS_QUERY_KEY,
          }),
        ]);
      }
    },
  });

  if (orderQuery.isLoading) {
    return (
      <LoadingRegion label={t("Загружаем тестовый заказ…")}>
        <Skeleton className="mx-auto min-h-[430px] max-w-xl rounded-xl" />
      </LoadingRegion>
    );
  }
  if (!orderQuery.data) {
    return (
      <Card className="mx-auto max-w-xl border-destructive/30">
        <CardContent
          className="grid justify-items-start gap-3 p-5 text-sm text-destructive"
          role="alert"
        >
          <p>{t(orderQuery.error?.message ?? "Не удалось загрузить заказ")}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void orderQuery.refetch()}
          >
            {t("Повторить")}
          </Button>
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
  const terminalMessage =
    order.status === "PAID"
      ? orderQuery.data.balance == null
        ? t("Оплата прошла успешно. Кредиты зачислены на баланс.")
        : t("Оплата прошла успешно. Новый баланс: {balance} кредитов.", {
            balance: orderQuery.data.balance,
          })
      : result.message
        ? t(result.message)
        : null;

  return (
    <Card className="mx-auto max-w-xl overflow-hidden">
      <CardHeader className="border-b border-border bg-secondary/35">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="warning">{t("Тестовый режим оплаты")}</Badge>
          <Badge variant={order.status === "PAID" ? "success" : "secondary"}>
            {t(checkoutStatusLabels[order.status])}
          </Badge>
        </div>
        <CardTitle className="pt-4">{t("Проверка тестовой оплаты")}</CardTitle>
        <CardDescription>
          {t("Реальные деньги не списываются. Выберите исход тестового заказа.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <dl className="grid gap-4 rounded-xl border border-border bg-secondary/25 p-4">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-sm text-muted-foreground">{t("Пакет")}</dt>
            <dd className="text-right text-sm font-semibold">
              {t(order.packageName)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-sm text-muted-foreground">{t("Кредиты")}</dt>
            <dd className="text-right text-sm font-semibold tabular-nums">
              {order.credits}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
            <dt className="text-sm text-muted-foreground">{t("К оплате")}</dt>
            <dd className="text-right font-mono text-lg font-semibold tabular-nums">
              {new Intl.NumberFormat(locale).format(order.amountUzs)} {t("сум")}
            </dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-3">
          <LoadingButton
            className="min-h-11 w-full"
            disabled={controlsDisabled}
            pending={outcome.isPending && outcome.variables === "PAID"}
            pendingText={t("Обрабатываем…")}
            onClick={() => outcome.mutate("PAID")}
            aria-label={t("Симулировать успешную оплату")}
          >
            <CheckCircle2 className="size-4" />
            {t("Симулировать успешную оплату")}
          </LoadingButton>
          <LoadingButton
            variant="destructive"
            className="min-h-11 w-full"
            disabled={controlsDisabled}
            pending={outcome.isPending && outcome.variables === "FAILED"}
            pendingText={t("Обрабатываем…")}
            onClick={() => outcome.mutate("FAILED")}
            aria-label={t("Симулировать ошибку оплаты")}
          >
            <AlertCircle className="size-4" />
            {t("Симулировать ошибку")}
          </LoadingButton>
          <LoadingButton
            variant="outline"
            className="min-h-11 w-full"
            disabled={controlsDisabled}
            pending={outcome.isPending && outcome.variables === "CANCELLED"}
            pendingText={t("Обрабатываем…")}
            onClick={() => outcome.mutate("CANCELLED")}
            aria-label={t("Отменить тестовую оплату")}
          >
            <Ban className="size-4" />
            {t("Отменить оплату")}
          </LoadingButton>
        </div>

        <div className="mt-5 min-h-12" aria-live="polite">
          {outcome.isPending ? (
            <p className="text-sm text-muted-foreground">
              {t("Обрабатываем тестовый результат…")}
            </p>
          ) : null}
          {outcomeError ? (
            <p className="text-sm text-destructive" role="alert">
              {t(outcomeError.message)}
            </p>
          ) : null}
          {terminalMessage ? (
            <p className={checkoutTerminalMessageClassName(order.status)}>
              {terminalMessage}
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
            {t(result.destination.label)}
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
            {t("Вернуться к пакетам")}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
