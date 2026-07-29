"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  History,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { APP_NAV_ITEMS } from "@/config/product";
import { cn } from "@/lib/cn";

const ICONS: Record<(typeof APP_NAV_ITEMS)[number]["icon"], LucideIcon> = {
  sparkles: Sparkles,
  history: History,
  user: UserRound,
  "credit-card": CreditCard,
};

function isActive(pathname: string, href: string) {
  if (href === "/app") {
    return pathname === "/app" || /^\/app\/[^/]+$/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?(): void;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("grid content-start gap-1", compact ? "p-2" : "p-3")}
      aria-label="Разделы приложения"
    >
      {!compact ? (
        <p className="px-3 pb-2 pt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Разделы
        </p>
      ) : null}
      {APP_NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={compact ? item.label : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
              active &&
                "bg-primary/12 text-primary hover:bg-primary/16 hover:text-primary",
              compact && "justify-center px-0",
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            {!compact ? <span>{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
