"use client";

import type { ReactNode } from "react";
import { DashboardShellClient } from "@/widgets/app-shell";
import { useAppSession } from "@/features/auth/index.client";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, wallet } = useAppSession();

  return (
    <DashboardShellClient user={user} creditBalance={wallet.balance}>
      {children}
    </DashboardShellClient>
  );
}
