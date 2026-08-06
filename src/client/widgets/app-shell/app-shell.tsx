import type { ReactNode } from "react";
import { AppTopbar, type AppUserSummary } from "./app-topbar";

export type { AppUserSummary };

export function AppShell({
  title,
  user,
  creditBalance,
  children,
}: {
  title?: string;
  user: AppUserSummary;
  creditBalance?: number | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AppTopbar title={title} user={user} creditBalance={creditBalance} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
