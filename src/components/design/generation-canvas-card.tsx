"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CircleAlert,
  ImageOff,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";
import type { WorkspaceGeneration } from "@/components/design/workspace-types";
import { buttonClassName } from "@/components/ui/button";

type GenerationCanvasCardProps = {
  generation: WorkspaceGeneration;
  variantNumber: number;
  cancelPending?: boolean;
  retryPending?: boolean;
  actionError?: string | null;
  onCancel(): void;
  onRetry(): void;
  onRemove(): void;
  onOpenResult(resultUrl: string): void;
};

async function readSignedResultUrl(fileId: string) {
  const response = await fetch(`/api/v1/media/${fileId}/signed-url`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Не удалось открыть результат");
  }
  return payload.data.url as string;
}

const statusLabels: Record<WorkspaceGeneration["status"], string> = {
  QUEUED: "В очереди",
  PROCESSING: "Создаётся",
  SUCCEEDED: "Готово",
  FAILED: "Ошибка",
  REJECTED: "Отклонено",
  CANCELLED: "Отменено",
};

function CardHeader({
  variantNumber,
  status,
}: {
  variantNumber: number;
  status: WorkspaceGeneration["status"];
}) {
  return (
    <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-border px-5">
      <div>
        <p className="text-sm font-black">Вариант {variantNumber}</p>
        <p className="mt-1 text-[11px] text-muted">
          {status === "SUCCEEDED" ? "Готовый дизайн" : "AI-генерация"}
        </p>
      </div>
      <span className="rounded-full bg-surface-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {statusLabels[status]}
      </span>
    </header>
  );
}

function StatusPanel({
  icon,
  title,
  message,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  message?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-0 flex-1 place-items-center bg-surface-elevated px-10 text-center">
      <div className="grid max-w-md justify-items-center gap-3">
        {icon}
        <p className="text-base font-black text-foreground">{title}</p>
        {message ? (
          <p className="text-sm leading-6 text-muted">{message}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function GenerationCanvasCard({
  generation,
  variantNumber,
  cancelPending = false,
  retryPending = false,
  actionError,
  onCancel,
  onRetry,
  onRemove,
  onOpenResult,
}: GenerationCanvasCardProps) {
  const resultQuery = useQuery({
    queryKey: ["generation-result", generation.resultUserId],
    queryFn: () => readSignedResultUrl(generation.resultUserId!),
    enabled:
      generation.status === "SUCCEEDED" && Boolean(generation.resultUserId),
    staleTime: 8 * 60_000,
    refetchInterval: 8 * 60_000,
  });

  let content: React.ReactNode;

  switch (generation.status) {
    case "QUEUED":
      content = (
        <StatusPanel
          icon={
            <LoaderCircle
              size={30}
              className="animate-spin text-accent"
              aria-hidden="true"
            />
          }
          title="В очереди"
          message="Запрос зарезервирован и ожидает запуска."
        >
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
            disabled={cancelPending}
            className={buttonClassName(
              "secondary",
              "mt-2 rounded-xl disabled:opacity-40",
            )}
          >
            {cancelPending ? "Отменяем…" : "Отменить"}
          </button>
          {actionError ? (
            <p role="alert" className="text-xs text-red-300">
              {actionError}
            </p>
          ) : null}
        </StatusPanel>
      );
      break;
    case "PROCESSING":
      content = (
        <StatusPanel
          icon={
            <LoaderCircle
              size={30}
              className="animate-spin text-accent"
              aria-hidden="true"
            />
          }
          title="AI создаёт интерьер"
          message="Результат появится здесь автоматически."
        />
      );
      break;
    case "SUCCEEDED":
      if (!generation.resultUserId) {
        content = (
        <StatusPanel
          icon={
            <ImageOff size={30} className="text-muted" aria-hidden="true" />
          }
            title="Результат недоступен"
            message="Файл результата ещё не привязан к генерации."
          />
        );
      } else if (resultQuery.isPending) {
        content = (
          <StatusPanel
            icon={
              <LoaderCircle
                size={30}
                className="animate-spin text-accent"
                aria-hidden="true"
              />
            }
            title="Загружаем вариант"
          />
        );
      } else if (resultQuery.isError) {
        content = (
          <StatusPanel
            icon={<ImageOff size={30} className="text-muted" aria-hidden="true" />}
            title="Не удалось открыть изображение"
            message={resultQuery.error.message}
          >
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void resultQuery.refetch();
              }}
              className={buttonClassName("secondary", "mt-2 rounded-xl")}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Повторить загрузку
            </button>
          </StatusPanel>
        );
      } else {
        content = (
          <div className="relative min-h-0 flex-1 bg-black">
            {/* Private signed URLs are short lived and intentionally bypass image optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultQuery.data}
              alt={`Вариант ${variantNumber}: ${generation.model.name}`}
              className="size-full object-contain"
              draggable={false}
            />
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpenResult(resultQuery.data);
              }}
              className={buttonClassName(
                "secondary",
                "absolute right-4 bottom-4 rounded-xl bg-surface/95 shadow-xl",
              )}
            >
              Сравнить и детали
            </button>
          </div>
        );
      }
      break;
    case "FAILED":
      content = (
        <StatusPanel
          icon={
            <CircleAlert
              size={30}
              className="text-red-300"
              aria-hidden="true"
            />
          }
          title="Не удалось создать интерьер"
          message={generation.errorMessage ?? "Произошла техническая ошибка."}
        >
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRetry();
            }}
            disabled={retryPending}
            className={buttonClassName(
              "primary",
              "mt-2 rounded-xl disabled:opacity-40",
            )}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {retryPending ? "Повторяем…" : "Повторить"}
          </button>
          {actionError ? (
            <p role="alert" className="text-xs text-red-300">
              {actionError}
            </p>
          ) : null}
        </StatusPanel>
      );
      break;
    case "REJECTED":
      content = (
        <StatusPanel
          icon={
            <ShieldAlert
              size={30}
              className="text-red-300"
              aria-hidden="true"
            />
          }
          title="Запрос отклонён"
          message={
            generation.errorMessage ??
            "Запрос не прошёл проверку безопасности. Измените описание и попробуйте снова."
          }
        >
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRetry();
            }}
            disabled={retryPending}
            className={buttonClassName(
              "primary",
              "mt-2 rounded-xl disabled:opacity-40",
            )}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {retryPending ? "Запускаем…" : "Повторить"}
          </button>
          {actionError ? (
            <p role="alert" className="text-xs text-red-300">
              {actionError}
            </p>
          ) : null}
        </StatusPanel>
      );
      break;
    case "CANCELLED":
      content = (
        <StatusPanel
          icon={<X size={30} className="text-muted" aria-hidden="true" />}
          title="Генерация отменена"
          message="Этот вариант не был запущен."
        >
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className={buttonClassName("secondary", "mt-2 rounded-xl")}
          >
            <X size={16} aria-hidden="true" />
            Убрать с холста
          </button>
        </StatusPanel>
      );
      break;
  }

  return (
    <div className="flex size-full min-h-0 flex-col overflow-hidden bg-surface">
      <CardHeader
        variantNumber={variantNumber}
        status={generation.status}
      />
      {content}
    </div>
  );
}
