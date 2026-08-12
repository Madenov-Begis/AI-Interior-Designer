"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Check,
  CircleAlert,
  Clock3,
  ExternalLink,
  ImageOff,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type Ref } from "react";
import { VisualPromptEditor } from "./visual-prompt-editor";
import type { WorkspaceGeneration } from "../model/workspace-types";
import { buttonClassName, LoadingButton } from "@/shared/ui";
import type { GenerationActionErrorPresentation } from "@/features/generate-design";
import type {
  VisualPromptEditorHandle,
  VisualPromptTool,
} from "@/features/visual-prompt";
import { apiData } from "@/shared/api";
import { CARD_HEADER_HEIGHT, containedMediaRect } from "../model/canvas-layout";

type GenerationCanvasCardProps = {
  generation: WorkspaceGeneration;
  variantNumber: string;
  cancelPending?: boolean;
  retryPending?: boolean;
  actionError?: GenerationActionErrorPresentation | null;
  selected: boolean;
  frameWidth: number;
  frameHeight: number;
  editorRef: Ref<VisualPromptEditorHandle>;
  tool: VisualPromptTool;
  color: string;
  strokeWidth: number;
  onHistoryStateChange(state: { canUndo: boolean; canRedo: boolean }): void;
  onEditorError(message: string | null): void;
  onCancel(): void;
  onRetry(): void;
  onOpenResult(resultUrl: string): void;
};

async function readSignedResultUrl(fileId: string) {
  const payload = await apiData<{ url: string }>({
    url: `/media/${fileId}/signed-url`,
    method: "GET",
  });
  return payload.url;
}

const statusLabels: Record<WorkspaceGeneration["status"], string> = {
  QUEUED: "В очереди",
  PROCESSING: "Создаётся",
  SUCCEEDED: "Готово",
  FAILED: "Ошибка",
  REJECTED: "Отклонено",
  CANCELLED: "Отменено",
};

function formatElapsed(createdAt: string, now: number) {
  const startedAt = new Date(createdAt).getTime();
  if (!Number.isFinite(startedAt)) return null;
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  if (seconds < 60) return `${seconds} сек`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes} мин ${remainder} сек` : `${minutes} мин`;
}

function useElapsedLabel(active: boolean, createdAt: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(interval);
  }, [active]);

  return active ? formatElapsed(createdAt, now) : null;
}

function CardHeader({
  variantNumber,
  status,
  selected,
  resultUrl,
  onOpenResult,
}: {
  variantNumber: string;
  status: WorkspaceGeneration["status"];
  selected: boolean;
  resultUrl?: string;
  onOpenResult(resultUrl: string): void;
}) {
  return (
    <header
      className="flex shrink-0 items-center justify-between border-b border-border px-5"
      style={{ height: CARD_HEADER_HEIGHT }}
    >
      <div className="min-w-0">
        <p className="text-sm font-black">Вариант {variantNumber}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {status === "SUCCEEDED" ? "Готовый дизайн" : "AI-генерация"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {selected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
            <Check size={14} strokeWidth={3} aria-hidden="true" />
            Выбран
          </span>
        ) : null}
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {statusLabels[status]}
        </span>
        {resultUrl ? (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onOpenResult(resultUrl);
            }}
            className={buttonClassName(
              "secondary",
              "h-10 rounded-lg px-3 text-xs",
            )}
            aria-label={`Открыть и скачать вариант ${variantNumber}`}
          >
            <ExternalLink size={15} aria-hidden="true" />
            Открыть
          </button>
        ) : null}
      </div>
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

function ActionErrorNotice({
  error,
}: {
  error: GenerationActionErrorPresentation;
}) {
  return (
    <p className="text-xs text-red-300" role="alert">
      {error.message}
      {error.purchaseLink ? (
        <>
          {" "}
          <Link
            href={error.purchaseLink.href}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="font-semibold underline underline-offset-2"
          >
            {error.purchaseLink.label}
          </Link>
        </>
      ) : null}
    </p>
  );
}

export function GenerationCanvasCard({
  generation,
  variantNumber,
  cancelPending = false,
  retryPending = false,
  actionError,
  selected,
  frameWidth,
  frameHeight,
  editorRef,
  tool,
  color,
  strokeWidth,
  onHistoryStateChange,
  onEditorError,
  onCancel,
  onRetry,
  onOpenResult,
}: GenerationCanvasCardProps) {
  const resultQuery = useQuery({
    queryKey: ["generation-result", generation.resultUserId],
    queryFn: () => readSignedResultUrl(generation.resultUserId!),
    enabled:
      generation.status === "SUCCEEDED" && Boolean(generation.resultUserId),
    initialData: generation.resultUrl ?? undefined,
    staleTime: 8 * 60_000,
    refetchInterval: 8 * 60_000,
  });
  const resultUnavailable =
    generation.status === "SUCCEEDED" && !generation.resultUserId;
  const elapsedLabel = useElapsedLabel(
    generation.status === "QUEUED" || generation.status === "PROCESSING",
    generation.createdAt,
  );
  const resultWidth = generation.resultUser?.width ?? null;
  const resultHeight = generation.resultUser?.height ?? null;
  const resultMediaRect = containedMediaRect(
    frameWidth,
    frameHeight,
    resultWidth,
    resultHeight,
  );
  const announcementIsError =
    generation.status === "FAILED" ||
    generation.status === "REJECTED" ||
    resultUnavailable ||
    resultQuery.isError ||
    Boolean(actionError);
  let announcement = statusLabels[generation.status];
  if (actionError) {
    announcement = actionError.message;
  } else if (resultQuery.isError) {
    announcement = resultQuery.error.message;
  } else if (resultUnavailable) {
    announcement = "Результат недоступен";
  } else if (generation.status === "FAILED") {
    announcement = generation.errorMessage ?? "Не удалось создать интерьер";
  } else if (generation.status === "REJECTED") {
    announcement = generation.errorMessage ?? "Запрос отклонён";
  } else if (generation.status === "SUCCEEDED" && resultQuery.isPending) {
    announcement = "Загружаем вариант";
  }

  let content: React.ReactNode;

  switch (generation.status) {
    case "QUEUED":
      content = (
        <StatusPanel
          icon={<Clock3 size={30} className="text-accent" aria-hidden="true" />}
          title="В очереди"
          message={`Запрос зарезервирован и ожидает запуска.${
            elapsedLabel ? ` Прошло ${elapsedLabel}.` : ""
          }`}
        >
          <LoadingButton
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
            pending={cancelPending}
            pendingText="Отменяем…"
            variant="secondary"
            className="mt-2 rounded-xl"
          >
            Отменить
          </LoadingButton>
          {actionError ? <ActionErrorNotice error={actionError} /> : null}
        </StatusPanel>
      );
      break;
    case "PROCESSING":
      content = (
        <StatusPanel
          icon={
            <Sparkles
              size={30}
              className="animate-pulse text-accent"
              aria-hidden="true"
            />
          }
          title="Создаём интерьер"
          message={`Результат появится здесь автоматически.${
            elapsedLabel ? ` Прошло ${elapsedLabel}.` : ""
          }`}
        >
          <div
            className="h-1.5 w-44 overflow-hidden rounded-full bg-background/70"
            aria-hidden="true"
          >
            <span className="ruvie-progress-sweep block h-full w-1/2 rounded-full bg-accent" />
          </div>
        </StatusPanel>
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
            icon={
              <ImageOff size={30} className="text-muted" aria-hidden="true" />
            }
            title="Не удалось открыть изображение"
            message={resultQuery.error.message}
          >
            <LoadingButton
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void resultQuery.refetch();
              }}
              pending={resultQuery.isFetching}
              pendingText="Загружаем…"
              variant="secondary"
              className="mt-2 rounded-xl"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Повторить загрузку
            </LoadingButton>
          </StatusPanel>
        );
      } else {
        content = (
          <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
            <div
              className="absolute overflow-hidden"
              style={{
                left: `${resultMediaRect.left}%`,
                top: `${resultMediaRect.top}%`,
                width: `${resultMediaRect.width}%`,
                height: `${resultMediaRect.height}%`,
              }}
            >
              {/* Private signed URLs are short lived and intentionally bypass image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultQuery.data}
                alt={`Готовый интерьер, вариант ${variantNumber}`}
                className="absolute inset-0 size-full object-contain"
                draggable={false}
                decoding="async"
                loading={selected ? "eager" : "lazy"}
                fetchPriority={selected ? "high" : "low"}
              />
              {selected && resultWidth && resultHeight ? (
                <div className="absolute inset-0">
                  <VisualPromptEditor
                    ref={editorRef}
                    editorWidth={resultWidth}
                    editorHeight={resultHeight}
                    sourceWidth={resultWidth}
                    sourceHeight={resultHeight}
                    initialState={null}
                    tool={tool}
                    color={color}
                    strokeWidth={strokeWidth}
                    onHistoryStateChange={onHistoryStateChange}
                    onPersistenceStateChange={onEditorError}
                  />
                </div>
              ) : null}
            </div>
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
          <LoadingButton
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRetry();
            }}
            pending={retryPending}
            pendingText="Повторяем…"
            variant="primary"
            className="rounded-xl"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Повторить
          </LoadingButton>
          {actionError ? <ActionErrorNotice error={actionError} /> : null}
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
          <LoadingButton
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRetry();
            }}
            pending={retryPending}
            pendingText="Запускаем…"
            variant="primary"
            className="rounded-xl"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Повторить
          </LoadingButton>
          {actionError ? <ActionErrorNotice error={actionError} /> : null}
        </StatusPanel>
      );
      break;
    case "CANCELLED":
      content = (
        <StatusPanel
          icon={<X size={30} className="text-muted" aria-hidden="true" />}
          title="Генерация отменена"
          message="Этот вариант не был запущен."
        />
      );
      break;
  }

  return (
    <div className="flex size-full min-h-0 flex-col overflow-hidden bg-surface">
      <span
        className="sr-only"
        role={announcementIsError ? "alert" : "status"}
        aria-live={announcementIsError ? "assertive" : "polite"}
      >
        {announcement}
      </span>
      <CardHeader
        variantNumber={variantNumber}
        status={generation.status}
        selected={selected}
        resultUrl={
          generation.status === "SUCCEEDED" ? resultQuery.data : undefined
        }
        onOpenResult={onOpenResult}
      />
      {content}
    </div>
  );
}
