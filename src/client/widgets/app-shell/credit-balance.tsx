"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { Button } from "@/shared/ui";
import { presentCreditBalance } from "@/features/manage-credits";
import { useAppSession } from "@/features/auth/index.client";

export function CreditBalance({
  balance,
  className,
}: {
  balance?: number | null;
  className?: string;
}) {
  const { wallet } = useAppSession();
  const presentation = presentCreditBalance(balance ?? wallet.balance);

  return (
    <Button asChild variant="outline" className={className}>
      <Link
        href="/app/credits"
        prefetch={false}
        aria-label={presentation.ariaLabel}
      >
        <Coins data-icon="inline-start" aria-hidden="true" />
        <span className="font-mono text-xs">{presentation.text}</span>
      </Link>
    </Button>
  );
}
