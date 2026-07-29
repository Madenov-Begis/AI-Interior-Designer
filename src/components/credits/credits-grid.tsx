"use client";

import {
  Check,
  Coins,
  CreditCard,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  creditQueryOptions,
  loadCredits,
} from "@/features/credits/client";
import {
  type CreditTransactionKind,
  formatUzs,
  fullGenerationCount,
  presentCreditBalance,
  presentCreditTransaction,
} from "@/features/credits/presentation";
import { cn } from "@/lib/cn";

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

async function apiData<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Запрос не выполнен");
  }
  return payload.data as T;
}

const creditDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function CreditsLoading() {
  return (
    <div>
      <Skeleton className="h-28 rounded-xl" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="min-h-80 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-xl" />
    </div>
  );
}

export function CreditsGrid() {
  const router = useRouter();
  const creditsQuery = useQuery(
    creditQueryOptions(({ signal }) =>
      loadCredits<CreditsPayload>(signal),
    ),
  );
  const createOrder = useMutation({
    mutationFn: async (packageCode: string) =>
      apiData<PaymentOrderCreated>(
        await fetch("/api/v1/payment-orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ packageCode }),
        }),
      ),
    onSuccess: ({ checkoutUrl }) => router.push(checkoutUrl),
  });

  if (creditsQuery.isLoading) {
    return <CreditsLoading />;
  }
  if (creditsQuery.error || !creditsQuery.data) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-5 text-sm text-destructive" role="alert">
          {creditsQuery.error?.message ?? "Не удалось загрузить кредиты"}
        </CardContent>
      </Card>
    );
  }

  const { balance, generationCost, packages, paymentMode, transactions } =
    creditsQuery.data;
  const disabled = paymentMode === "disabled";
  const presentedBalance = presentCreditBalance(balance);

  return (
    <div className="min-w-0">
      <Card className="mb-6 overflow-hidden border-primary/25 bg-primary/[0.055]">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Coins
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Текущий баланс</p>
              <p
                className="mt-1 text-3xl font-semibold tabular-nums"
                aria-label={presentedBalance.ariaLabel}
              >
                {presentedBalance.text}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Доступно полных генераций:{" "}
                <span className="tabular-nums">
                  {fullGenerationCount(balance, generationCost)}
                </span>
              </p>
            </div>
          </div>
          {paymentMode === "mock" ? (
            <Badge variant="warning" className="w-fit shrink-0">
              Тестовый режим оплаты
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/7 p-4">
        <ShieldCheck
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold">
            Генерация стоит {generationCost} кредита
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            При технической ошибке кредиты автоматически возвращаются на баланс.
          </p>
        </div>
      </div>

      {disabled ? (
        <Card className="mb-4 border-warning/25 bg-warning/[0.055]">
          <CardContent className="p-4 text-sm leading-6">
            Оплата временно недоступна. Баланс и пакеты уже готовы к подключению
            Payme или Click.
          </CardContent>
        </Card>
      ) : null}

      {createOrder.error ? (
        <Card className="mb-4 border-destructive/30">
          <CardContent
            className="p-4 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {createOrder.error.message}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((item) => {
          const isCreating =
            createOrder.isPending && createOrder.variables === item.code;
          return (
            <Card
              key={item.code}
              className={cn(
                "relative min-h-72 overflow-hidden",
                item.popular && "border-primary/45 bg-primary/[0.055]",
              )}
            >
              {item.popular ? (
                <Badge className="absolute right-4 top-4">Популярный</Badge>
              ) : null}
              <CardHeader>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {item.name}
                </p>
                <CardTitle className="mt-5 flex items-end gap-2">
                  <span className="text-5xl font-medium tracking-[-0.06em] tabular-nums">
                    {item.credits}
                  </span>
                  <span className="pb-1 text-sm font-normal text-muted-foreground">
                    кредитов
                  </span>
                </CardTitle>
                <CardDescription>
                  Хватит на{" "}
                  <span className="tabular-nums">
                    {fullGenerationCount(item.credits, generationCost)}
                  </span>{" "}
                  полных генераций
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="font-mono text-xl font-semibold tabular-nums">
                  {formatUzs(item.priceUzs)}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="size-4 text-success" aria-hidden="true" />
                  Кредиты не сгорают
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="min-h-11 w-full"
                  disabled={disabled || createOrder.isPending}
                  onClick={() => createOrder.mutate(item.code)}
                  aria-label={`Купить пакет «${item.name}» за ${formatUzs(item.priceUzs)}`}
                >
                  <CreditCard className="size-4" />
                  {isCreating ? "Открываем оплату…" : "Купить пакет"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-5 text-primary" aria-hidden="true" />
            Последние операции
          </CardTitle>
          <CardDescription>
            Начисления, списания и возвраты по вашему балансу.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Операций пока нет.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((transaction) => {
                const presented = presentCreditTransaction(transaction);
                return (
                  <li
                    key={transaction.id}
                    className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {presented.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {creditDateFormatter.format(
                          new Date(transaction.createdAt),
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:block sm:text-right">
                      <p
                        className={cn(
                          "font-mono text-sm font-semibold tabular-nums",
                          transaction.amount > 0
                            ? "text-success"
                            : transaction.amount < 0
                              ? "text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {presented.amountText}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {presented.balanceText}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
