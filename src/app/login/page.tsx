"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, Sparkle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { APP_NAME } from "@/config/brand";
import { apiData } from "@/lib/api/client";
import { safeReturnPath } from "@/lib/auth/route-policy";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeReturnPath(searchParams.get("next"));
  const session = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () =>
      apiData<{ id: string }>({
        url: "/auth/me",
        method: "GET",
        skipAuthRedirect: true,
      }),
    retry: false,
  });

  useEffect(() => {
    if (session.data?.id) router.replace(next);
  }, [next, router, session.data?.id]);

  const googleLoginUrl = `/api/v1/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md rounded-[24px] shadow-2xl shadow-black/35">
        <CardHeader className="p-6 sm:p-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Sparkle
              className="size-5 fill-primary text-primary"
              aria-hidden="true"
            />
            <span className="text-lg font-black italic tracking-[-0.045em]">
              {APP_NAME}
            </span>
          </Link>
          <p className="mt-8 font-mono text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
            Личный кабинет
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Войдите, чтобы начать интерьер
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ваши проекты, изображения и ветки изменений будут доступны на любом
            устройстве.
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
          <Link
            href={googleLoginUrl}
            aria-disabled={session.isLoading}
            className={buttonClassName(
              "outline",
              "w-full justify-center",
              "lg",
            )}
          >
            <KeyRound className="size-5" />
            {session.isLoading ? "Проверяем вход…" : "Продолжить с Google"}
          </Link>
          <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            Google используется только для безопасного входа.
          </p>
          <Link
            href="/"
            className="mt-6 block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Вернуться на главную
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
