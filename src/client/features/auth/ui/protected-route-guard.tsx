"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAppSessionQuery } from "../api/client";
import { AppSessionProvider } from "../model/context";

export function ProtectedRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAppSessionQuery();

  useEffect(() => {
    if (auth.isPending || auth.data) return;

    const next =
      typeof window === "undefined"
        ? pathname
        : `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [auth.data, auth.isPending, pathname, router]);

  if (!auth.data) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
        <div className="grid justify-items-center gap-4 text-center">
          <LoaderCircle
            className="size-7 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">Проверяем сессию…</p>
        </div>
      </main>
    );
  }

  return (
    <AppSessionProvider session={auth.data}>{children}</AppSessionProvider>
  );
}
