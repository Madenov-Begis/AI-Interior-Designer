"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { GENERATION_CREDIT_COST } from "@/client/shared/config/product";
import { Button } from "@/client/shared/components/ui/button";
import { creditQueryOptions, loadCredits } from "@/client/features/credits/client";
import { presentCreditBalance } from "@/client/features/credits/presentation";

export function CreditBalance({
  balance,
  className,
}: {
  balance?: number | null;
  className?: string;
}) {
  const creditsQuery = useQuery(
    creditQueryOptions(
      ({ signal }) => loadCredits(signal),
      balance == null
        ? undefined
        : {
            balance,
            generationCost: GENERATION_CREDIT_COST,
          },
    ),
  );
  const presentation = presentCreditBalance(
    creditsQuery.data?.balance ?? balance,
  );

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
