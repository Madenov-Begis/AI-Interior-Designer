"use client";

import type { ReactNode } from "react";
import { AppShell, type AppUserSummary } from "./app-shell";

export function DashboardShellClient({
  user,
  creditBalance,
  children,
}: {
  user: AppUserSummary;
  creditBalance: number;
  children: ReactNode;
}) {
  return (
    <AppShell user={user} creditBalance={creditBalance}>
      {children}
    </AppShell>
  );
}
