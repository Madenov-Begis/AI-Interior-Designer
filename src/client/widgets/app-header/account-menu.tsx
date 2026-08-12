"use client";

import Link from "next/link";
import {
  CreditCard,
  FolderOpen,
  LoaderCircle,
  LogOut,
  Plus,
  UserRound,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui";
import { Button } from "@/shared/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui";
import { apiData } from "@/shared/api";

export type RuvieUserSummary = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export function AccountMenu({
  user,
  creditBalance,
}: {
  user: RuvieUserSummary;
  creditBalance?: number | null;
}) {
  const logout = useMutation({
    mutationFn: () => apiData({ url: "/auth/logout", method: "POST" }),
    onSuccess: () => {
      window.location.href = "/";
    },
  });
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
            <Link href="/app" prefetch={false}>
              <Plus />
              Создать проект
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/app/projects" prefetch={false}>
              <FolderOpen />
              Все проекты
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/app/credits" prefetch={false}>
              <CreditCard />
              Пополнить баланс
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
            disabled={logout.isPending}
            onSelect={(event) => {
              event.preventDefault();
              logout.mutate();
            }}
          >
            {logout.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <LogOut />
            )}
            {logout.isPending ? "Выходим…" : "Выйти"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {logout.error ? (
          <p className="px-2 py-1.5 text-xs text-destructive" role="alert">
            {logout.error.message}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
