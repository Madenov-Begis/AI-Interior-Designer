"use client";

import Link from "next/link";
import { CreditCard, LogOut, Sparkle, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/client/shared/components/ui/avatar";
import { Button } from "@/client/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/shared/components/ui/dropdown-menu";
import { apiData } from "@/client/shared/api/client";

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="h-12 rounded-full px-1 pl-3"
          aria-label="Открыть меню аккаунта"
        >
          <span
            className="inline-flex items-center gap-1.5 font-bold"
            aria-label={`Баланс: ${creditBalance ?? 0} кредитов`}
          >
            <Sparkle data-icon="inline-start" />
            {creditBalance ?? 0}
          </span>
          <Avatar size="lg">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-72">
        <DropdownMenuLabel>
          <span className="block truncate">{user.name}</span>
          <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/app/credits" prefetch={false}>
              <Sparkle />
              Пополнить баланс
              <CreditCard className="ml-auto" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/app/profile" prefetch={false}>
              <UserRound />
              Профиль
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onSelect={async () => {
              await apiData({ url: "/auth/logout", method: "POST" });
              window.location.href = "/";
            }}
          >
            <LogOut />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
