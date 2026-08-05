"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import {
  AppShell,
  type AppUserSummary,
} from "@/client/widgets/app-shell/app-shell";
import { Button } from "@/client/shared/components/ui/button";
import { creditQueryOptions, loadCredits } from "@/client/features/credits/client";

type WalletPayload = {
  balance: number;
  generationCost: number;
};

export function DashboardShellClient({
  user,
  children,
}: {
  user: AppUserSummary;
  children: ReactNode;
}) {
  const wallet = useQuery(
    creditQueryOptions(({ signal }) => loadCredits<WalletPayload>(signal)),
  );

  if (!wallet.data) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
        <div className="grid max-w-sm justify-items-center gap-4 text-center">
          {wallet.error ? (
            <>
              <p className="text-sm text-destructive" role="alert">
                {wallet.error.message}
              </p>
              <Button onClick={() => wallet.refetch()}>Повторить</Button>
            </>
          ) : (
            <>
              <LoaderCircle className="size-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Загружаем личный кабинет…
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <AppShell user={user} creditBalance={wallet.data.balance}>
      {children}
    </AppShell>
  );
}
