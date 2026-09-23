"use client";

import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { loadAppSession } from "@/features/auth/api/client";
import { GoogleSignInPanel } from "@/features/auth/ui/google-sign-in-panel";
import { AppIntlProvider, useAppText } from "@/shared/providers";
import { SIGNUP_CREDIT_GRANT } from "@/shared/config";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import type { Locale } from "@/i18n/routing";

type AuthGate = {
  open(next: string, trigger: HTMLAnchorElement): void;
  checking: boolean;
};
const LandingAuthContext = createContext<AuthGate | null>(null);

export function LandingAuthGate({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [next, setNext] = useState("/app");
  const triggerRef = useRef<HTMLAnchorElement | null>(null);

  async function requestEntry(destination: string, trigger: HTMLAnchorElement) {
    if (checking) return;
    triggerRef.current = trigger;
    setChecking(true);
    try {
      const session = await loadAppSession();
      if (session) {
        window.location.assign(destination);
        return;
      }
    } catch {
      // Если проверка недоступна, OAuth всё ещё может начать вход.
    } finally {
      setChecking(false);
    }
    setNext(destination);
    setOpen(true);
  }

  return (
    <LandingAuthContext.Provider
      value={{
        open: (destination, trigger) => void requestEntry(destination, trigger),
        checking,
      }}
    >
      {children}
      <AppIntlProvider locale={locale}>
        <LandingAuthDialog
          open={open}
          onOpenChange={setOpen}
          next={next}
          onRestoreFocus={() => triggerRef.current?.focus()}
        />
      </AppIntlProvider>
    </LandingAuthContext.Provider>
  );
}

function LandingAuthDialog({
  open,
  onOpenChange,
  next,
  onRestoreFocus,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  next: string;
  onRestoreFocus(): void;
}) {
  const t = useAppText();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
        className="max-h-[calc(100dvh-2rem)] w-[calc(100%-24px)] max-w-[480px] gap-0 overflow-y-auto rounded-[30px] border-white/15 bg-card p-0 shadow-[0_32px_100px_rgba(0,0,0,0.65)]"
      >
        <div
          className="relative flex h-36 shrink-0 overflow-hidden bg-background sm:h-40"
          aria-hidden="true"
        >
          <div className="relative h-full w-[38%]">
            <Image
              src="/images/landing/japandi-before.png"
              alt=""
              fill
              sizes="(max-width: 640px) 38vw, 182px"
              className="object-cover"
            />
          </div>
          <div className="relative h-full flex-1">
            <Image
              src="/images/interior-styles/japandi.webp"
              alt=""
              fill
              sizes="(max-width: 640px) 62vw, 298px"
              className="object-cover"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-transparent to-black/15" />
          <span className="absolute right-5 bottom-4 rounded-full border border-white/25 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
            {t("Новый интерьер")}
          </span>
        </div>
        <DialogClose
          className="absolute top-4 right-4 z-10 grid size-10 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/55 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t("Закрыть")}
        >
          <X className="size-4" aria-hidden="true" />
        </DialogClose>
        <div className="px-6 pb-6 pt-1 sm:px-8 sm:pb-8">
          <DialogHeader className="text-left">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.19em] text-primary">
              Ruvie
            </p>
            <DialogTitle className="text-[25px] font-semibold leading-[1.12] tracking-[-0.045em] sm:text-[28px]">
              {t("Войдите, чтобы начать интерьер")}
            </DialogTitle>
            <DialogDescription className="max-w-sm text-sm leading-5 text-muted-foreground">
              {t("После входа откроется холст для вашей комнаты.")}
            </DialogDescription>
          </DialogHeader>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-2 text-[13px] font-medium leading-none text-foreground">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            {t("Вы получите {count} бесплатных кредитов", {
              count: SIGNUP_CREDIT_GRANT,
            })}
          </p>
          <div className="mt-6">
            <GoogleSignInPanel next={next} presentation="modal" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LandingAuthLink({
  href,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "onClick"> & {
  href: "/app" | "/app/credits" | "/login";
}) {
  const gate = useContext(LandingAuthContext);
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (!gate) return;
    event.preventDefault();
    gate.open(href === "/login" ? "/app" : href, event.currentTarget);
  }
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-disabled={gate?.checking || undefined}
      {...props}
    >
      {children}
    </Link>
  );
}
