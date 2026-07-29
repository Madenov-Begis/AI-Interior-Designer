import Link from "next/link";
import { Coins } from "lucide-react";
import { presentCreditBalance } from "@/features/credits/presentation";
import { cn } from "@/lib/cn";

export function CreditBalance({
  balance,
  className,
}: {
  balance?: number | null;
  className?: string;
}) {
  const presentation = presentCreditBalance(balance);

  return (
    <Link
      href="/app/credits"
      prefetch={false}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg border border-primary/25 bg-primary/8 px-3 font-mono text-xs font-semibold text-primary outline-none transition-colors hover:bg-primary/12 focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
      aria-label={presentation.ariaLabel}
    >
      <Coins className="size-4" aria-hidden="true" />
      <span>{presentation.text}</span>
    </Link>
  );
}
