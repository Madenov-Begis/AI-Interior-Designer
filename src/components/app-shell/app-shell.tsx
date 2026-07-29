import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import {
  AppTopbar,
  type AppUserSummary,
} from "@/components/app-shell/app-topbar";

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
      <div className="grid min-h-0 flex-1 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-card lg:block">
          <AppSidebar />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
