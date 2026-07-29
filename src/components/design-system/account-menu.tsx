"use client";

import Link from "next/link";
import {
  CreditCard,
  LogOut,
  Sparkle,
  UserRound,
} from "lucide-react";

export type RenoaUserSummary = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export function AccountMenu({
  user,
  creditBalance,
}: {
  user: RenoaUserSummary;
  creditBalance?: number | null;
}) {
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "R";

  return (
    <details className="group relative">
      <summary className="flex h-12 cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-[#1d1d1f] p-1 pl-3 outline-none transition-colors hover:border-muted-foreground/45 focus-visible:ring-2 focus-visible:ring-ring/60">
        <span
          className="inline-flex items-center gap-1.5 text-sm font-bold"
          aria-label={`Баланс: ${creditBalance ?? 0} кредитов`}
        >
          <Sparkle className="size-4 fill-primary text-primary" />
          {creditBalance ?? 0}
        </span>
        <span className="grid size-9 place-items-center overflow-hidden rounded-full border border-border bg-[#8f6f62] text-sm font-semibold text-white">
          {user.avatarUrl ? (
            // Remote user avatar cannot use a stable Next image loader.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="sr-only">Открыть меню аккаунта</span>
      </summary>

      <div className="absolute right-0 z-[80] mt-3 w-[280px] overflow-hidden rounded-[24px] border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/45">
        <div className="border-b border-border px-5 py-4">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>
        <Link
          href="/app/credits"
          prefetch={false}
          className="flex min-h-14 items-center gap-3 border-b border-border px-5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <Sparkle className="size-5 fill-primary text-primary" />
          Пополнить баланс
          <CreditCard className="ml-auto size-5 text-muted-foreground" />
        </Link>
        <Link
          href="/app/profile"
          prefetch={false}
          className="flex min-h-14 items-center gap-3 border-b border-border px-5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <UserRound className="size-5 text-muted-foreground" />
          Профиль
        </Link>
        <button
          type="button"
          className="flex min-h-14 w-full items-center gap-3 px-5 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
          onClick={async () => {
            await fetch("/api/v1/auth/logout", { method: "POST" });
            window.location.href = "/";
          }}
        >
          <LogOut className="size-5" />
          Выйти
        </button>
      </div>
    </details>
  );
}
