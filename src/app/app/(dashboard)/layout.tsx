"use client";

import type { ReactNode } from "react";
import { DashboardShellClient } from "@/client/widgets/app-shell/dashboard-shell-client";
import { useCurrentAuthUser } from "@/client/features/auth/client";

function metadataString(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentAuthUser();
  const email = user?.email ?? "";
  const metadata = user?.user_metadata ?? {};

  return (
    <DashboardShellClient
      user={{
        name:
          metadataString(metadata, "full_name", "name") ||
          email.split("@")[0] ||
          "Пользователь",
        email,
        avatarUrl: metadataString(metadata, "avatar_url", "picture"),
      }}
    >
      {children}
    </DashboardShellClient>
  );
}
