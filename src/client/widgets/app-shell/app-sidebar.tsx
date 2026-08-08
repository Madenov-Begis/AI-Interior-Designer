"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  ImagePlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { APP_NAV_ITEMS } from "@/shared/config";
import { Button } from "@/shared/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui";
import { cn } from "@/shared/lib";

const ICONS: Record<(typeof APP_NAV_ITEMS)[number]["icon"], LucideIcon> = {
  "image-plus": ImagePlus,
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
    <TooltipProvider>
      <nav
        className={cn("grid content-start gap-1", compact ? "p-2" : "p-3")}
        aria-label="Разделы приложения"
      >
        {!compact ? (
          <p className="px-3 pt-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Разделы
          </p>
        ) : null}
        {APP_NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href);
          const navigationButton = (
            <Button
              asChild
              variant={active ? "secondary" : "ghost"}
              size={compact ? "icon" : "default"}
              className={cn(!compact && "w-full justify-start")}
            >
              <Link
                href={item.href}
                prefetch={false}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
              >
                <Icon data-icon="inline-start" aria-hidden="true" />
                {!compact ? <span>{item.label}</span> : null}
              </Link>
            </Button>
          );

          return compact ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{navigationButton}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            <div key={item.href}>{navigationButton}</div>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
