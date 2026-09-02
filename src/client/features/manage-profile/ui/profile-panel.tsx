"use client";

import {
  ArrowRight,
  CheckCircle2,
  Copy,
  FolderOpen,
  ImageIcon,
  LoaderCircle,
  LogOut,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui";
import { Avatar, AvatarFallback } from "@/shared/ui";
import {
  Button,
  buttonClassName,
  LoadingButton,
  LoadingRegion,
} from "@/shared/ui";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui";
import { Input } from "@/shared/ui";
import { Skeleton } from "@/shared/ui";
import { RuviePanel } from "@/shared/ui";
import { presentWalletSummary } from "@/features/manage-credits";
import { apiData } from "@/shared/api";
import {
  updateAppSessionUser,
  useAppSession,
} from "@/features/auth/index.client";

type ProfilePayload = {
  profile: {
    email: string;
    displayName: string | null;
  };
  usage: {
    used: number;
  };
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
    <LoadingRegion
      label="Загружаем профиль…"
      className="mx-auto max-w-[1080px] px-5 py-14"
    >
      <Skeleton className="mx-auto size-28 rounded-full" />
      <Skeleton className="mx-auto mt-5 h-9 w-52" />
      <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_470px]">
        <Skeleton className="h-[520px] rounded-[24px]" />
        <Skeleton className="h-[520px] rounded-[24px]" />
      </div>
    </LoadingRegion>
  );
}
export function ProfilePanel() {
  const queryClient = useQueryClient();
  const { wallet } = useAppSession();
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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
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
      updateAppSessionUser(queryClient, {
        name:
          updatedProfile.displayName?.trim() ||
          updatedProfile.email.split("@")[0] ||
          "Пользователь",
        email: updatedProfile.email,
      });
    },
  });
  const logout = useMutation({
    mutationFn: () => apiData({ url: "/auth/logout", method: "POST" }),
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  if (profile.isLoading) return <ProfileLoading />;
  if (profile.error || !profile.data) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Alert variant="destructive">
          <AlertTitle>Профиль недоступен</AlertTitle>
          <AlertDescription>
            <p>{profile.error?.message ?? "Повторите попытку позже"}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => profile.refetch()}
            >
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { usage } = profile.data;
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
    <div className="ruvie-grid min-h-[calc(100dvh-72px)] px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <div className="text-center">
          <Avatar className="mx-auto size-28 text-5xl">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.035em]">
            {displayName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.data.profile.email}
          </p>
        </div>

        <div className="mt-12 grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_470px]">
          <RuviePanel className="min-w-0 p-6">
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
                        loading="lazy"
                        decoding="async"
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
              {projects.isLoading
                ? Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="min-h-36 rounded-[18px]" />
                  ))
                : null}
            </div>
            {projects.error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Не удалось загрузить проекты</AlertTitle>
                <AlertDescription>
                  <p>{projects.error.message}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => projects.refetch()}
                  >
                    Повторить
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <Link
              href="/app/projects"
              className="mt-4 flex min-h-24 items-center gap-4 rounded-[18px] border border-border px-5 transition-colors hover:bg-secondary"
            >
              <FolderOpen className="size-7" />
              <span>
                <b className="block">Все проекты</b>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Поиск, сортировка и управление
                </span>
              </span>
              <ArrowRight className="ml-auto size-5 text-muted-foreground" />
            </Link>
          </RuviePanel>

          <div className="grid min-w-0 gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <RuviePanel className="border-primary bg-primary p-6 text-primary-foreground">
                <p className="text-4xl font-black italic">{wallet.balance}</p>
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
              </RuviePanel>
              <RuviePanel className="p-6">
                <ImageIcon className="size-5 text-primary" />
                <p className="mt-5 text-4xl font-black italic">{usage.used}</p>
                <p className="mt-2 text-sm font-bold">Сгенерировано</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Всего изображений
                </p>
              </RuviePanel>
            </div>

            <RuviePanel className="p-6">
              <h2 className="text-xl font-black italic">Данные аккаунта</h2>
              <FieldGroup className="mt-5 gap-4">
                <Field data-invalid={Boolean(update.error)}>
                  <FieldLabel htmlFor="profile-name">Имя</FieldLabel>
                  <Input
                    id="profile-name"
                    ref={nameInputRef}
                    defaultValue={profile.data.profile.displayName ?? ""}
                    maxLength={120}
                    aria-invalid={Boolean(update.error)}
                    onChange={() => {
                      update.reset();
                      setCopyStatus(null);
                    }}
                  />
                  <FieldError>{update.error?.message}</FieldError>
                </Field>
                <Field data-disabled>
                  <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                  <Input
                    id="profile-email"
                    value={profile.data.profile.email}
                    disabled
                  />
                </Field>
              </FieldGroup>
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
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <LoadingButton
                  onClick={() => update.mutate()}
                  pending={update.isPending}
                  pendingText="Сохраняем…"
                  className="w-full sm:w-auto"
                >
                  Сохранить
                </LoadingButton>
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        profile.data.profile.email,
                      );
                      setCopyStatus("Email скопирован.");
                    } catch {
                      setCopyStatus("Не удалось скопировать email.");
                    }
                  }}
                >
                  <Copy data-icon="inline-start" />
                  Копировать email
                </Button>
              </div>
              <p
                className={`mt-3 min-h-5 text-xs ${
                  copyStatus?.startsWith("Не удалось")
                    ? "text-destructive"
                    : "text-success"
                }`}
                role="status"
                aria-live="polite"
              >
                {copyStatus ??
                  (update.isSuccess ? "Изменения сохранены." : null)}
              </p>
            </RuviePanel>

            <p className="px-2 text-xs leading-5 text-muted-foreground">
              {walletSummary.availableGenerationsText}
            </p>
            <Button
              variant="ghost"
              className="justify-center text-muted-foreground hover:text-destructive"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {logout.isPending ? (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <LogOut data-icon="inline-start" />
              )}
              {logout.isPending ? "Выходим…" : "Выйти"}
            </Button>
            {logout.error ? (
              <p
                className="px-2 text-center text-xs text-destructive"
                role="alert"
              >
                {logout.error.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
