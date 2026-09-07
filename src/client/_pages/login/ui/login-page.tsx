"use client";

import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type MouseEvent } from "react";
import {
  buttonClassName,
  Card,
  CardContent,
  CardHeader,
  RuvieLogo,
} from "@/shared/ui";
import { useCurrentAuthUser } from "@/features/auth";
import { safeReturnPath } from "@/features/auth";
import { apiUrl } from "@/shared/api/url";
import {
  LEGAL_ROUTES,
  PRIVACY_POLICY_VERSION,
  PUBLIC_OFFER_VERSION,
} from "@config/legal";

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
  const [legalAccepted, setLegalAccepted] = useState(false);
  const googleLoginUrl = apiUrl(
    `/auth/google?next=${encodeURIComponent(next)}`,
  );

  const startGoogleLogin = (event: MouseEvent<HTMLAnchorElement>) => {
    if (checkingSession || !legalAccepted) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const loginUrl = new URL(googleLoginUrl);
    loginUrl.searchParams.set("returnOrigin", window.location.origin);
    loginUrl.searchParams.set(
      "legalAcceptance",
      `${PRIVACY_POLICY_VERSION}:${PUBLIC_OFFER_VERSION}`,
    );
    window.location.assign(loginUrl);
  };

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12"
      tabIndex={-1}
    >
      <Card className="w-full max-w-md rounded-[24px] shadow-2xl shadow-black/35">
        <CardHeader className="p-6 sm:p-8">
          <RuvieLogo href="/" />
          <p className="mt-8 font-mono text-xs font-semibold tracking-[0.16em] text-primary uppercase">
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
          <label className="mb-4 flex cursor-pointer items-start gap-3 text-sm leading-5 text-muted-foreground">
            <input
              type="checkbox"
              checked={legalAccepted}
              onChange={(event) => setLegalAccepted(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>
              Я принимаю{" "}
              <Link
                className="text-foreground underline hover:text-primary"
                href={LEGAL_ROUTES.offer}
              >
                Публичную оферту
              </Link>{" "}
              и даю согласие на обработку данных согласно{" "}
              <Link
                className="text-foreground underline hover:text-primary"
                href={LEGAL_ROUTES.privacy}
              >
                Политике конфиденциальности
              </Link>
              .
            </span>
          </label>
          <Link
            href={googleLoginUrl}
            onClick={startGoogleLogin}
            aria-disabled={checkingSession || !legalAccepted}
            aria-busy={checkingSession || undefined}
            tabIndex={checkingSession || !legalAccepted ? -1 : undefined}
            className={buttonClassName(
              "outline",
              "w-full justify-center aria-disabled:pointer-events-none aria-disabled:opacity-50",
              "lg",
            )}
          >
            {checkingSession ? (
              <LoaderCircle
                className="size-5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <KeyRound className="size-5" aria-hidden="true" />
            )}
            {checkingSession ? "Проверяем вход…" : "Продолжить с Google"}
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
