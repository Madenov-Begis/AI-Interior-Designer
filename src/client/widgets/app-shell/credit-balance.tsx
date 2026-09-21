"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { Button } from "@/shared/ui";
import { useAppSession } from "@/features/auth/index.client";
import { useAppText } from "@/shared/providers";
import { GENERATION_CREDIT_COST } from "@/shared/config";

export function CreditBalance({
  balance,
  className,
}: {
  balance?: number | null;
  className?: string;
}) {
  const t = useAppText();
  const { wallet } = useAppSession();
  const resolvedBalance = balance ?? wallet.balance;
  const text =
    resolvedBalance == null
      ? t("{cost} / генерация", { cost: GENERATION_CREDIT_COST })
      : t("{balance} кредитов", { balance: resolvedBalance });
  const ariaLabel =
    resolvedBalance == null
      ? t("Открыть кредиты. Генерация стоит {cost} кредита", {
          cost: GENERATION_CREDIT_COST,
        })
      : t("Баланс: {balance} кредитов", { balance: resolvedBalance });

  return (
    <Button asChild variant="outline" className={className}>
      <Link
        href="/app/credits"
        prefetch={false}
        aria-label={ariaLabel}
      >
        <Coins data-icon="inline-start" aria-hidden="true" />
        <span className="font-mono text-xs">{text}</span>
      </Link>
    </Button>
  );
}
