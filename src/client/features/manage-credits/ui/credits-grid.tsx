"use client";

import {
  CheckCircle2,
  CreditCard,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui";
import { Badge } from "@/shared/ui";
import { Button, LoadingButton, LoadingRegion } from "@/shared/ui";
import { RuviePanel } from "@/shared/ui";
import { Skeleton } from "@/shared/ui";
import {
  CREDIT_PACKAGES_QUERY_KEY,
  CREDIT_TRANSACTIONS_QUERY_KEY,
  loadCreditPackages,
  loadCreditTransactions,
} from "../api/client.ts";
import {
  fullGenerationCount,
  presentCreditTransaction,
} from "../model/presentation.ts";
import { cn } from "@/shared/lib";
import { apiData } from "@/shared/api";
import { useAppSession } from "@/features/auth/index.client";
import { useLocale } from "next-intl";
import { useAppText } from "@/shared/providers";

type PaymentOrderCreated = {
  checkoutUrl: string;
};

export function CreditsGrid() {
  const locale = useLocale();
  const t = useAppText();
  const creditDateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const router = useRouter();
  const { wallet } = useAppSession();
  const packagesQuery = useQuery({
    queryKey: CREDIT_PACKAGES_QUERY_KEY,
    queryFn: ({ signal }) => loadCreditPackages(signal),
  });
  const transactionsQuery = useQuery({
    queryKey: CREDIT_TRANSACTIONS_QUERY_KEY,
    queryFn: ({ signal }) => loadCreditTransactions(signal),
  });
  const createOrder = useMutation({
    mutationFn: async (packageCode: string) =>
      apiData<PaymentOrderCreated>({
        url: "/payment-orders",
        method: "POST",
        data: { packageCode },
      }),
    onSuccess: ({ checkoutUrl }) => router.push(checkoutUrl),
  });

  if (packagesQuery.isLoading) {
    return (
      <LoadingRegion
        label={t("Загружаем пакеты кредитов…")}
        className="ruvie-grid min-h-[calc(100dvh-72px)] p-5 sm:p-8"
      >
        <Skeleton className="mx-auto h-[620px] max-w-[1280px] rounded-[30px]" />
      </LoadingRegion>
    );
  }
  if (packagesQuery.error || !packagesQuery.data) {
    return (
      <div className="ruvie-grid min-h-[calc(100dvh-72px)] p-8">
        <Alert variant="destructive" className="mx-auto max-w-3xl">
          <AlertTitle>{t("Не удалось загрузить кредиты")}</AlertTitle>
          <AlertDescription>
            <p>
              {packagesQuery.error?.message ?? t("Повторите попытку позже")}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void packagesQuery.refetch()}
            >
              {t("Повторить")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { balance, generationCost } = wallet;
  const { items: packages, paymentMode } = packagesQuery.data;
  const transactions = transactionsQuery.data?.items ?? [];
  const disabled = paymentMode === "disabled";

  return (
    <div className="ruvie-grid min-h-[calc(100dvh-72px)] p-4 sm:p-8">
      <section className="ruvie-panel-shadow mx-auto max-w-[1280px] overflow-hidden rounded-[30px] border border-border bg-card">
        <header className="flex flex-col gap-4 border-b border-border px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {t("Магазин кредитов")}
            </p>
            <h1 className="mt-2 text-3xl font-black italic tracking-[-0.04em]">
              {t("Выберите подходящий пакет")}
            </h1>
          </div>
          <div className="rounded-full border border-border bg-background px-4 py-2">
            <span>
              <span className="block text-xs text-muted-foreground">
                {t("Ваш баланс")}
              </span>
              <b
                className="block text-lg tabular-nums"
                aria-label={t("Баланс: {balance} кредитов", { balance })}
              >
                {t("{balance} кредитов", { balance })}
              </b>
            </span>
          </div>
        </header>

        <div className="p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {packages.map((item) => {
              const isCreating =
                createOrder.isPending && createOrder.variables === item.code;
              return (
                <article
                  key={item.code}
                  className="relative flex min-h-[420px] flex-col rounded-[28px] bg-[#ececeb] p-7 text-[#19191b]"
                >
                  {item.popular ? (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-success px-4 text-[#102217]">
                      {t("Выбирают чаще")}
                    </Badge>
                  ) : null}
                  <h2 className="text-3xl font-black italic">{t(item.name)}</h2>
                  <p className="mt-1 text-sm text-[#5e5e63]">
                    {item.description
                      ? t(item.description)
                      : t("Пакет кредитов Ruvie")}
                  </p>
                  <p className="mt-7 text-4xl font-black tabular-nums">
                    {new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: "UZS",
                      maximumFractionDigits: 0,
                    }).format(item.priceUzs)}
                  </p>
                  <p className="mt-4 flex items-center gap-2 text-xl font-black">
                    {item.credits} {t("кредитов")}
                  </p>
                  <div className="my-6 h-px bg-black/8" />
                  <p className="text-xs font-bold text-[#5e5e63]">
                    {t("Хватит на")}
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-5 fill-success text-white" />
                    {fullGenerationCount(item.credits, generationCost)}{" "}
                    {t("генераций интерьера")}
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-5 fill-success text-white" />
                    {t("Кредиты не сгорают")}
                  </p>
                  <LoadingButton
                    className={cn(
                      "mt-auto w-full",
                      item.popular
                        ? "bg-primary text-primary-foreground"
                        : "bg-[#2c2c2f] text-white hover:bg-[#1d1d1f]",
                    )}
                    size="lg"
                    disabled={disabled || createOrder.isPending}
                    pending={isCreating}
                    pendingText={t("Открываем…")}
                    onClick={() => createOrder.mutate(item.code)}
                  >
                    <CreditCard className="size-4" />
                    {t("Купить")}
                  </LoadingButton>
                </article>
              );
            })}
          </div>

          <Alert className="mt-5">
            <ShieldCheck />
            <AlertTitle>
              {t("Генерация стоит")} {generationCost} {t("кредита")}
            </AlertTitle>
            <AlertDescription>
              {t("При технической ошибке кредиты автоматически возвращаются.")}
            </AlertDescription>
          </Alert>

          {paymentMode === "mock" ? (
            <p className="mt-4 text-xs text-warning">
              {t("Сейчас включён тестовый режим оплаты.")}
            </p>
          ) : null}
          {disabled ? (
            <p className="mt-4 text-xs text-warning">
              {t("Оплата временно недоступна.")}
            </p>
          ) : null}
          {createOrder.error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>{t("Не удалось открыть оплату")}</AlertTitle>
              <AlertDescription>{createOrder.error.message}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </section>

      <RuviePanel className="mx-auto mt-6 max-w-[1280px] p-6">
        <h2 className="flex items-center gap-2 text-xl font-black italic">
          <ReceiptText className="size-5 text-primary" />
          {t("Последние операции")}
        </h2>
        {transactionsQuery.isLoading ? (
          <LoadingRegion
            label={t("Загружаем операции…")}
            className="mt-4 space-y-3"
          >
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </LoadingRegion>
        ) : transactionsQuery.error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>{t("Не удалось загрузить операции")}</AlertTitle>
            <AlertDescription>
              <p>{transactionsQuery.error.message}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void transactionsQuery.refetch()}
              >
                {t("Повторить")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : transactions.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            {t("Операций пока нет.")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {transactions.map((transaction) => {
              const presented = presentCreditTransaction(transaction);
              return (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {t(presented.label)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {creditDateFormatter.format(
                        new Date(transaction.createdAt),
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-mono text-sm font-bold tabular-nums",
                        transaction.amount > 0
                          ? "text-success"
                          : "text-foreground",
                      )}
                    >
                      {presented.amountText}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("Баланс после операции")}: {transaction.balanceAfter}{" "}
                      {t("кредитов")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </RuviePanel>
    </div>
  );
}
