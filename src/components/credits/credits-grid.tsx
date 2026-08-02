"use client";

import {
  CheckCircle2,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Sparkle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RenoaPanel } from "@/components/design-system/surfaces";
import { Skeleton } from "@/components/ui/skeleton";
import { creditQueryOptions, loadCredits } from "@/features/credits/client";
import {
  type CreditTransactionKind,
  formatUzs,
  fullGenerationCount,
  presentCreditBalance,
  presentCreditTransaction,
} from "@/features/credits/presentation";
import { cn } from "@/lib/cn";
import { apiData } from "@/lib/api/client";

type CreditPackage = {
  code: string;
  name: string;
  credits: number;
  priceUzs: number;
  popular: boolean;
};

type CreditTransaction = {
  id: string;
  kind: CreditTransactionKind;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

type CreditsPayload = {
  balance: number;
  generationCost: number;
  packages: CreditPackage[];
  paymentMode: "disabled" | "mock";
  transactions: CreditTransaction[];
};

type PaymentOrderCreated = {
  checkoutUrl: string;
};

const creditDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CreditsGrid() {
  const router = useRouter();
  const creditsQuery = useQuery(
    creditQueryOptions(({ signal }) => loadCredits<CreditsPayload>(signal)),
  );
  const createOrder = useMutation({
    mutationFn: async (packageCode: string) =>
      apiData<PaymentOrderCreated>({
        url: "/payment-orders",
        method: "POST",
        data: { packageCode },
      }),
    onSuccess: ({ checkoutUrl }) => router.push(checkoutUrl),
  });

  if (creditsQuery.isLoading) {
    return (
      <div className="renoa-grid min-h-[calc(100dvh-72px)] p-5 sm:p-8">
        <Skeleton className="mx-auto h-[620px] max-w-[1280px] rounded-[30px]" />
      </div>
    );
  }
  if (creditsQuery.error || !creditsQuery.data) {
    return (
      <div className="renoa-grid min-h-[calc(100dvh-72px)] p-8">
        <RenoaPanel className="mx-auto max-w-3xl border-destructive/30 p-5 text-sm text-destructive">
          {creditsQuery.error?.message ?? "Не удалось загрузить кредиты"}
        </RenoaPanel>
      </div>
    );
  }

  const { balance, generationCost, packages, paymentMode, transactions } =
    creditsQuery.data;
  const disabled = paymentMode === "disabled";
  const presentedBalance = presentCreditBalance(balance);

  return (
    <div className="renoa-grid min-h-[calc(100dvh-72px)] p-4 sm:p-8">
      <section className="renoa-panel-shadow mx-auto max-w-[1280px] overflow-hidden rounded-[30px] border border-border bg-card">
        <header className="flex flex-col gap-4 border-b border-border px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Магазин кредитов
            </p>
            <h1 className="mt-2 text-3xl font-black italic tracking-[-0.04em]">
              Выберите подходящий пакет
            </h1>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2">
            <Sparkle className="size-5 fill-primary text-primary" />
            <span>
              <span className="block text-[11px] text-muted-foreground">
                Ваш баланс
              </span>
              <b
                className="block text-lg tabular-nums"
                aria-label={presentedBalance.ariaLabel}
              >
                {presentedBalance.text}
              </b>
            </span>
          </div>
        </header>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
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
                      Выбирают чаще
                    </Badge>
                  ) : null}
                  <h2 className="text-3xl font-black italic">{item.name}</h2>
                  <p className="mt-1 text-sm text-[#5e5e63]">
                    Для {item.popular ? "активной работы" : "новых проектов"}
                  </p>
                  <p className="mt-7 text-4xl font-black tabular-nums">
                    {formatUzs(item.priceUzs)}
                  </p>
                  <p className="mt-4 flex items-center gap-2 text-xl font-black">
                    <Sparkle className="size-6 fill-primary text-primary" />
                    {item.credits} кредитов
                  </p>
                  <div className="my-6 h-px bg-black/8" />
                  <p className="text-xs font-bold text-[#5e5e63]">Хватит на</p>
                  <p className="mt-3 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-5 fill-success text-white" />
                    {fullGenerationCount(item.credits, generationCost)}{" "}
                    генераций интерьера
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-5 fill-success text-white" />
                    Кредиты не сгорают
                  </p>
                  <Button
                    className={cn(
                      "mt-auto w-full",
                      item.popular
                        ? "bg-primary text-primary-foreground"
                        : "bg-[#2c2c2f] text-white hover:bg-[#1d1d1f]",
                    )}
                    size="lg"
                    disabled={disabled || createOrder.isPending}
                    onClick={() => createOrder.mutate(item.code)}
                  >
                    <CreditCard className="size-4" />
                    {isCreating ? "Открываем…" : "Купить"}
                  </Button>
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-primary/20 bg-primary/7 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-bold">
                Генерация стоит {generationCost} кредита
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                При технической ошибке кредиты автоматически возвращаются.
              </p>
            </div>
          </div>

          {paymentMode === "mock" ? (
            <p className="mt-4 text-xs text-warning">
              Сейчас включён тестовый режим оплаты.
            </p>
          ) : null}
          {disabled ? (
            <p className="mt-4 text-xs text-warning">
              Оплата временно недоступна.
            </p>
          ) : null}
          {createOrder.error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {createOrder.error.message}
            </p>
          ) : null}
        </div>
      </section>

      <RenoaPanel className="mx-auto mt-6 max-w-[1280px] p-6">
        <h2 className="flex items-center gap-2 text-xl font-black italic">
          <ReceiptText className="size-5 text-primary" />
          Последние операции
        </h2>
        {transactions.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Операций пока нет.
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
                    <p className="text-sm font-semibold">{presented.label}</p>
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
                      {presented.balanceText}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </RenoaPanel>
    </div>
  );
}
