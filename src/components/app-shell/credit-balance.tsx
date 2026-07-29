import Link from "next/link";
import { Coins } from "lucide-react";
import { GENERATION_CREDIT_COST } from "@/config/product";
import { cn } from "@/lib/cn";

export function CreditBalance({
  balance,
  className,
}: {
  balance?: number | null;
  className?: string;
}) {
  return (
    <Link
      href="/app/credits"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg border border-primary/25 bg-primary/8 px-3 font-mono text-xs font-semibold text-primary outline-none transition-colors hover:bg-primary/12 focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
      aria-label={
        balance == null
          ? `Открыть кредиты. Генерация стоит ${GENERATION_CREDIT_COST} кредита`
          : `Баланс ${balance} кредитов`
      }
    >
      <Coins className="size-4" aria-hidden="true" />
      <span>{balance == null ? `${GENERATION_CREDIT_COST} / генерация` : `${balance} кредитов`}</span>
    </Link>
  );
}
