"use client";

import type { ReactNode } from "react";
import { useAppSession } from "@/features/auth/index.client";
import { RuvieAppHeader } from "@/widgets/app-header";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { user, wallet } = useAppSession();

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <RuvieAppHeader user={user} creditBalance={wallet.balance} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
