"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { buttonClassName } from "@/shared/ui";
import { apiUrl } from "@/shared/api/url";
import { useAppText } from "@/shared/providers";
import {
  LEGAL_ROUTES,
  PRIVACY_POLICY_VERSION,
  PUBLIC_OFFER_VERSION,
} from "@config/legal";

export function GoogleSignInPanel({
  next,
  checkingSession = false,
  presentation = "page",
}: {
  next: string;
  checkingSession?: boolean;
  presentation?: "page" | "modal";
}) {
  const t = useAppText();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const googleLoginUrl = apiUrl(
    `/auth/google?next=${encodeURIComponent(next)}`,
  );

  const startGoogleLogin = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (checkingSession || !legalAccepted) return;

    const loginUrl = new URL(googleLoginUrl);
    loginUrl.searchParams.set("returnOrigin", window.location.origin);
    loginUrl.searchParams.set(
      "legalAcceptance",
      `${PRIVACY_POLICY_VERSION}:${PUBLIC_OFFER_VERSION}`,
    );
    window.location.assign(loginUrl);
  };

  return (
    <div>
      <label
        className={
          presentation === "modal"
            ? "mb-4 flex cursor-pointer items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3.5 text-[13px] leading-[1.55] text-foreground/80 transition-colors hover:border-white/20"
            : "mb-4 flex cursor-pointer items-start gap-3 text-sm leading-5 text-muted-foreground"
        }
      >
        <input
          type="checkbox"
          checked={legalAccepted}
          onChange={(event) => setLegalAccepted(event.target.checked)}
          className={
            presentation === "modal"
              ? "mt-0.5 size-[18px] shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              : "mt-0.5 size-4 shrink-0 accent-primary"
          }
        />
        <span>
          {t("Я принимаю")}{" "}
          <Link
            className="text-foreground underline hover:text-primary"
            href={LEGAL_ROUTES.offer}
          >
            {t("Публичную оферту")}
          </Link>{" "}
          {t("и даю согласие на обработку данных согласно")}{" "}
          <Link
            className="text-foreground underline hover:text-primary"
            href={LEGAL_ROUTES.privacy}
          >
            {t("Политике конфиденциальности")}
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
          presentation === "modal" ? "secondary" : "outline",
          presentation === "modal"
            ? "h-13 w-full justify-center rounded-2xl bg-foreground text-background shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-[background-color,transform] hover:bg-white active:translate-y-px focus-visible:ring-2 focus-visible:ring-primary aria-disabled:pointer-events-none aria-disabled:bg-white/12 aria-disabled:text-white/45 aria-disabled:shadow-none"
            : "w-full justify-center aria-disabled:pointer-events-none aria-disabled:opacity-50",
          "lg",
        )}
      >
        {checkingSession ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <Image
            src="/images/google-g.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden="true"
          />
        )}
        {checkingSession ? t("Проверяем вход…") : t("Продолжить с Google")}
      </Link>
      <p
        className={
          presentation === "modal"
            ? "mt-5 flex items-center justify-center gap-2 border-t border-white/10 pt-4 text-center text-xs leading-5 text-muted-foreground"
            : "mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground"
        }
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
        {t("Google используется только для безопасного входа.")}
      </p>
    </div>
  );
}
