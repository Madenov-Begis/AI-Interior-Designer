"use client";

import { ApiClientError } from "@/shared/api";
import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAppSessionQuery } from "../api/client";
import { AppSessionProvider } from "../model/context";
import { useAppText } from "@/shared/providers";
import { WorkspaceLoadingSkeleton } from "@/shared/ui";

export function ProtectedRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAppSessionQuery();
  const t = useAppText();

  useEffect(() => {
    if (
      auth.isPending ||
      auth.data ||
      (auth.isError &&
        (!(auth.error instanceof ApiClientError) || auth.error.status !== 401))
    )
      return;

    const next =
      typeof window === "undefined"
        ? pathname
        : `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [auth.data, auth.error, auth.isError, auth.isPending, pathname, router]);

  if (
    !auth.data &&
    auth.isError &&
    (!(auth.error instanceof ApiClientError) || auth.error.status !== 401)
  ) {
    return (
      <main
        className="grid min-h-dvh place-content-center gap-4 text-center"
        role="alert"
      >
        <p>{t("Не удалось проверить сессию. Проверьте соединение.")}</p>
        <button type="button" onClick={() => void auth.refetch()}>
          {t("Повторить")}
        </button>
      </main>
    );
  }
  if (!auth.data) {
    if (
      pathname === "/app" ||
      /^\/app\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        pathname,
      )
    ) {
      return (
        <main id="main-content" className="min-h-dvh" tabIndex={-1}>
          <WorkspaceLoadingSkeleton
            fullScreen
            label={t("Открываем рабочее пространство…")}
          />
        </main>
      );
    }
    return (
      <main
        id="main-content"
        className="grid min-h-dvh place-items-center bg-background px-4 text-foreground"
        tabIndex={-1}
      >
        <div
          className="delayed-loading-indicator grid justify-items-center gap-4 text-center"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="size-7 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            {t("Проверяем сессию…")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <AppSessionProvider session={auth.data}>{children}</AppSessionProvider>
  );
}
