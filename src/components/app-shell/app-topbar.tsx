"use client";

import Link from "next/link";
import { Menu, ScanLine, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/config/brand";
import { APP_NAV_ITEMS } from "@/config/product";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { CreditBalance } from "@/components/app-shell/credit-balance";

export type AppUserSummary = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export function AppTopbar({
  title,
  user,
  creditBalance,
}: {
  title?: string;
  user: AppUserSummary;
  creditBalance?: number | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentTitle =
    title ??
    APP_NAV_ITEMS.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ??
    APP_NAME;
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "R";

  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-5">
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Открыть меню"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>

        <Link
          href="/app"
          prefetch={false}
          className="hidden items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex"
          aria-label={`${APP_NAME} — создать интерьер`}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="text-sm font-black uppercase tracking-[0.12em]">
            {APP_NAME}
          </span>
        </Link>

        <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
          {currentTitle}
        </p>

        <CreditBalance balance={creditBalance} className="hidden sm:inline-flex" />

        <details className="group relative">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-xs font-bold outline-none transition-colors hover:border-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/50">
            {user.avatarUrl ? (
              // Google avatar URL is user-owned remote content and cannot use a stable Next Image loader.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              initials
            )}
            <span className="sr-only">Открыть меню профиля</span>
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/35">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/app/profile"
              prefetch={false}
              className="flex h-10 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent-surface hover:text-foreground"
            >
              Профиль
            </Link>
            <Link
              href="/app/credits"
              prefetch={false}
              className="flex h-10 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent-surface hover:text-foreground"
            >
              Кредиты
            </Link>
          </div>
        </details>
      </header>

      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[min(21rem,88vw)] max-w-none gap-0 bg-card p-0 text-card-foreground sm:max-w-none"
      >
        <SheetHeader className="flex-row items-center gap-3 border-b p-4">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="size-[18px]" aria-hidden="true" />
          </span>
          <SheetTitle>{APP_NAME}</SheetTitle>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              aria-label="Закрыть меню"
            >
              <X className="size-4" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b p-3 sm:hidden">
            <CreditBalance balance={creditBalance} className="w-full justify-center" />
          </div>
          <AppSidebar onNavigate={() => setMenuOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
