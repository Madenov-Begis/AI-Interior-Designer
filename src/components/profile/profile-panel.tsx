"use client";

import { CheckCircle2, KeyRound, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type CreditWalletPayload,
  presentWalletSummary,
} from "@/features/credits/presentation";
import {
  creditQueryOptions,
  loadCredits,
} from "@/features/credits/client";

type ProfilePayload = {
  profile: {
    email: string;
    displayName: string | null;
    role: string;
    status: string;
    timezone: string;
    createdAt: string;
  };
  usage: {
    used: number;
    limit: number | null;
    remaining: number | null;
    plan: {
      code: string;
      name: string;
      watermarkRequired: boolean;
    };
  };
  wallet: CreditWalletPayload;
};

async function apiData(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Запрос не выполнен");
  }
  return payload.data;
}

export function ProfilePanel() {
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () =>
      (await apiData(await fetch("/api/v1/profile"))) as ProfilePayload,
  });
  const credits = useQuery(
    creditQueryOptions(
      ({ signal }) => loadCredits<CreditWalletPayload>(signal),
      profile.data?.wallet,
    ),
  );
  const nameInputRef = useRef<HTMLInputElement>(null);
  const update = useMutation({
    mutationFn: async () =>
      apiData(
        await fetch("/api/v1/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            displayName: nameInputRef.current?.value.trim(),
            timezone: "Asia/Tashkent",
          }),
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (profile.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (profile.error || !profile.data) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-5 text-sm text-destructive">
          {profile.error?.message ?? "Профиль недоступен"}
        </CardContent>
      </Card>
    );
  }

  const { usage } = profile.data;
  const wallet = credits.data ?? profile.data.wallet;
  const walletSummary = presentWalletSummary(wallet);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex-row items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
              <UserRound className="size-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Личные данные</CardTitle>
              <CardDescription className="mt-1">
                Имя видно только внутри вашего аккаунта.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-semibold">
                Имя
                <Input
                  ref={nameInputRef}
                  defaultValue={profile.data.profile.displayName ?? ""}
                  maxLength={120}
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold">
                Email
                <Input
                  value={profile.data.profile.email}
                  disabled
                  className="text-muted-foreground"
                />
              </label>
            </div>
            {update.error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {update.error.message}
              </p>
            ) : null}
            <Button
              onClick={() => update.mutate()}
              disabled={update.isPending}
              className="mt-5"
            >
              {update.isPending ? "Сохраняем…" : "Сохранить изменения"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" aria-hidden="true" />
              Способ входа
            </CardTitle>
            <CardDescription>
              Авторизация защищает проекты, историю и результаты.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/55 p-3">
              <span className="grid size-9 place-items-center rounded-full bg-background text-sm font-bold">
                G
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Google подключён</p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile.data.profile.email}
                </p>
              </div>
              <CheckCircle2 className="size-5 text-success" aria-label="Подключено" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4">
        <Card className="border-primary/30 bg-primary/[0.055]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{walletSummary.balanceText}</CardTitle>
              <Badge variant="outline">Кредиты Renoa</Badge>
            </div>
            <CardDescription>
              Для всех проектов и итераций.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {walletSummary.availableGenerationsText}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {walletSummary.generationCostText}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {walletSummary.expirationText}
                </span>
              </div>
              <div className="border-t border-primary/15 pt-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  {usage.plan.name} · {usage.plan.watermarkRequired
                    ? "Результаты с водяным знаком"
                    : "Результаты без водяного знака"}
                </p>
              </div>
            </div>
            <Link
              href="/app/credits"
              prefetch={false}
              className={buttonClassName("outline", "mt-5 w-full")}
            >
              Открыть кредиты
            </Link>
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          className="justify-start text-muted-foreground hover:text-destructive"
          onClick={async () => {
            await fetch("/api/v1/auth/logout", { method: "POST" });
            window.location.href = "/";
          }}
        >
          <LogOut className="size-4" />
          Выйти из аккаунта
        </Button>
      </div>
    </div>
  );
}
