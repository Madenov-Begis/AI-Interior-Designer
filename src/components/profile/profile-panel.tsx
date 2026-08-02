"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  FolderOpen,
  ImageIcon,
  LogOut,
  Plus,
  Sparkle,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RenoaPanel } from "@/components/design-system/surfaces";
import {
  type CreditWalletPayload,
  presentWalletSummary,
} from "@/features/credits/presentation";
import { creditQueryOptions, loadCredits } from "@/features/credits/client";
import { apiData } from "@/lib/api/client";

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
    plan: {
      code: string;
      name: string;
      watermarkRequired: boolean;
    };
  };
  wallet: CreditWalletPayload;
};

type ProfileProject = {
  id: string;
  name: string;
  previewUrl: string | null;
  updatedAt: string;
  generationCount: number;
};

function ProfileLoading() {
  return (
    <div className="mx-auto max-w-[1080px] px-5 py-14">
      <Skeleton className="mx-auto size-28 rounded-full" />
      <Skeleton className="mx-auto mt-5 h-9 w-52" />
      <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_470px]">
        <Skeleton className="h-[520px] rounded-[24px]" />
        <Skeleton className="h-[520px] rounded-[24px]" />
      </div>
    </div>
  );
}
export function ProfilePanel() {
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiData<ProfilePayload>({ url: "/profile", method: "GET" }),
  });
  const projects = useQuery({
    queryKey: ["projects", "profile"],
    queryFn: () =>
      apiData<{ items: ProfileProject[] }>({
        url: "/projects",
        method: "GET",
        params: { limit: 4 },
      }),
  });
  const credits = useQuery(
    creditQueryOptions(
      ({ signal }) => loadCredits<CreditWalletPayload>(signal),
      profile.data?.wallet,
    ),
  );
  const nameInputRef = useRef<HTMLInputElement>(null);
  const update = useMutation({
    mutationFn: () =>
      apiData<{ profile: ProfilePayload["profile"] }>({
        url: "/profile",
        method: "PATCH",
        data: {
          displayName: nameInputRef.current?.value.trim(),
          timezone: "Asia/Tashkent",
        },
      }),
    onSuccess: ({ profile: updatedProfile }) => {
      queryClient.setQueryData<ProfilePayload>(["profile"], (current) =>
        current ? { ...current, profile: updatedProfile } : current,
      );
    },
  });

  if (profile.isLoading) return <ProfileLoading />;
  if (profile.error || !profile.data) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <RenoaPanel className="border-destructive/30 p-5 text-sm text-destructive">
          {profile.error?.message ?? "Профиль недоступен"}
        </RenoaPanel>
      </div>
    );
  }

  const { usage } = profile.data;
  const wallet = credits.data ?? profile.data.wallet;
  const walletSummary = presentWalletSummary(wallet);
  const displayName =
    profile.data.profile.displayName ||
    profile.data.profile.email.split("@")[0] ||
    "Пользователь";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="renoa-grid min-h-[calc(100dvh-72px)] px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <div className="text-center">
          <div className="mx-auto grid size-28 place-items-center rounded-full border border-border bg-[#8f6f62] text-5xl font-medium text-white shadow-xl shadow-black/25">
            {initials}
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.035em]">
            {displayName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.data.profile.email}
          </p>
        </div>

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_470px]">
          <RenoaPanel className="p-6">
            <h2 className="text-2xl font-black italic">Проекты</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/app"
                className="flex min-h-36 items-center gap-4 rounded-[18px] border border-dashed border-border px-5 transition-colors hover:border-primary"
              >
                <Plus className="size-8 text-primary" />
                <div>
                  <p className="font-bold">Создать проект</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Фото сразу на холсте
                  </p>
                </div>
                <ArrowRight className="ml-auto size-5 text-muted-foreground" />
              </Link>

              {(projects.data?.items ?? []).slice(0, 3).map((project) => (
                <Link
                  key={project.id}
                  href={`/app/${project.id}`}
                  className="flex min-h-36 items-center gap-4 rounded-[18px] border border-border p-3 transition-colors hover:border-muted-foreground/45"
                >
                  <span className="grid h-24 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                    {project.previewUrl ? (
                      // Signed project image cannot use a stable Next image loader.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.previewUrl}
                        alt={project.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate">{project.name}</b>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString("ru-RU")}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Изображений: {project.generationCount}
                    </span>
                  </span>
                  <ArrowRight className="ml-auto size-5 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
            <Link
              href="/app/projects"
              className="mt-4 flex min-h-24 items-center gap-4 rounded-[18px] border border-border px-5 transition-colors hover:bg-secondary"
            >
              <FolderOpen className="size-7" />
              <span>
                <b className="block">
                  Все проекты {projects.data?.items.length ?? 0}
                </b>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Поиск, сортировка и управление
                </span>
              </span>
              <ArrowRight className="ml-auto size-5 text-muted-foreground" />
            </Link>
          </RenoaPanel>

          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-4">
              <RenoaPanel className="border-primary bg-primary p-6 text-primary-foreground">
                <Sparkle className="size-5 fill-current" />
                <p className="mt-5 text-4xl font-black italic">
                  {wallet.balance}
                </p>
                <p className="mt-2 text-sm font-bold">Баланс кредитов</p>
                <Link
                  href="/app/credits"
                  className={buttonClassName(
                    "outline",
                    "mt-5 border-0 bg-white text-[#19191b] hover:bg-white/90",
                    "sm",
                  )}
                >
                  <Plus className="size-4" />
                  Пополнить
                </Link>
              </RenoaPanel>
              <RenoaPanel className="p-6">
                <Sparkle className="size-5 text-primary" />
                <p className="mt-5 text-4xl font-black italic">{usage.used}</p>
                <p className="mt-2 text-sm font-bold">Сгенерировано</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Всего изображений
                </p>
              </RenoaPanel>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                [Clock3, "История баланса", "/app/credits"],
                [Code2, "Кабинет API", "/app/profile"],
                [UsersRound, "Кредиты за друзей", "/app/profile"],
                [UsersRound, "Общий баланс", "/app/profile"],
              ].map(([Icon, label, href]) => {
                const ItemIcon = Icon as typeof Clock3;
                return (
                  <Link key={label as string} href={href as string}>
                    <RenoaPanel className="grid min-h-32 place-items-center p-4 text-center transition-colors hover:bg-secondary">
                      <span>
                        <ItemIcon className="mx-auto size-5 text-muted-foreground" />
                        <b className="mt-3 block text-sm">{label as string}</b>
                      </span>
                    </RenoaPanel>
                  </Link>
                );
              })}
            </div>

            <RenoaPanel className="p-6">
              <h2 className="text-xl font-black italic">Данные аккаунта</h2>
              <label className="mt-5 block text-xs font-bold text-muted-foreground">
                Имя
                <Input
                  ref={nameInputRef}
                  defaultValue={profile.data.profile.displayName ?? ""}
                  maxLength={120}
                  className="mt-2"
                />
              </label>
              <label className="mt-4 block text-xs font-bold text-muted-foreground">
                Email
                <Input
                  value={profile.data.profile.email}
                  disabled
                  className="mt-2"
                />
              </label>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
                <span className="grid size-10 place-items-center rounded-full bg-white font-bold text-[#4285f4]">
                  G
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">Google</b>
                  <span className="block truncate text-xs text-muted-foreground">
                    {profile.data.profile.email}
                  </span>
                </span>
                <CheckCircle2 className="size-5 text-success" />
              </div>
              {update.error ? (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {update.error.message}
                </p>
              ) : null}
              <div className="mt-5 flex gap-3">
                <Button
                  onClick={() => update.mutate()}
                  disabled={update.isPending}
                >
                  {update.isPending ? "Сохраняем…" : "Сохранить"}
                </Button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-3 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    navigator.clipboard.writeText(profile.data.profile.email)
                  }
                >
                  <Copy className="size-4" />
                  Копировать email
                </button>
              </div>
            </RenoaPanel>

            <p className="px-2 text-xs leading-5 text-muted-foreground">
              {walletSummary.availableGenerationsText} · {usage.plan.name}
            </p>
            <Button
              variant="ghost"
              className="justify-center text-muted-foreground hover:text-destructive"
              onClick={async () => {
                await apiData({ url: "/auth/logout", method: "POST" });
                window.location.href = "/";
              }}
            >
              <LogOut className="size-4" />
              Выйти
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
