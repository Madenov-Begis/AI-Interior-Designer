"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Card, CardContent, CardHeader, RuvieLogo } from "@/shared/ui";
import { useCurrentAuthUser } from "@/features/auth";
import { safeReturnPath } from "@/features/auth";
import { GoogleSignInPanel } from "@/features/auth/ui/google-sign-in-panel";
import { AppLanguageSwitcher, useAppText } from "@/shared/providers";

export function LoginPage() {
  return (
    <Suspense fallback={<LoginCard next="/app" checkingSession />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useCurrentAuthUser();
  const next = safeReturnPath(searchParams.get("next"));

  useEffect(() => {
    if (auth.data) router.replace(next);
  }, [auth.data, next, router]);

  return (
    <LoginCard next={next} checkingSession={auth.isPending || !!auth.data} />
  );
}

function LoginCard({
  next,
  checkingSession,
}: {
  next: string;
  checkingSession: boolean;
}) {
  const t = useAppText();

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12"
      tabIndex={-1}
    >
      <Card className="w-full max-w-md rounded-[24px] shadow-2xl shadow-black/35">
        <CardHeader className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <RuvieLogo href="/" />
            <AppLanguageSwitcher />
          </div>
          <p className="mt-8 font-mono text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            {t("Личный кабинет")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            {t("Войдите, чтобы начать интерьер")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t(
              "Ваши проекты, изображения и ветки изменений будут доступны на любом устройстве.",
            )}
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
          <GoogleSignInPanel next={next} checkingSession={checkingSession} />
          <Link
            href="/"
            className="mt-6 block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("Вернуться на главную")}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
