"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { Button } from "@/components/ui/button";
import { apiData } from "@/lib/api/client";

type AuthPayload = {
  id: string;
  email?: string;
  profile: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
};

type WalletPayload = { balance: number };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const auth = useQuery({
    queryKey: ["auth", "me"],
    queryFn: ({ signal }) =>
      apiData<AuthPayload>({ url: "/auth/me", method: "GET", signal }),
  });
  const wallet = useQuery({
    queryKey: ["credits"],
    queryFn: ({ signal }) =>
      apiData<WalletPayload>({ url: "/credits", method: "GET", signal }),
  });

  if (!auth.data || !wallet.data) {
    const error = auth.error ?? wallet.error;
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
        <div className="grid max-w-sm justify-items-center gap-4 text-center">
          {error ? (
            <>
              <p className="text-sm text-destructive" role="alert">
                {error.message}
              </p>
              <Button
                onClick={() => {
                  void auth.refetch();
                  void wallet.refetch();
                }}
              >
                Повторить
              </Button>
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

  const profile = auth.data.profile;
  const email = auth.data.email ?? "";
  const fallbackName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <AppShell
      user={{
        name:
          profile.displayName ||
          fallbackName ||
          email.split("@")[0] ||
          "Пользователь",
        email,
        avatarUrl: profile.avatarUrl,
      }}
      creditBalance={wallet.data.balance}
    >
      {children}
    </AppShell>
  );
}
