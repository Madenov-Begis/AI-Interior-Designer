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
import Link from "next/link";
import type { Ref } from "react";
import { VisualPromptEditor } from "@/components/design/visual-prompt-editor";
import type { WorkspaceGeneration } from "@/components/design/workspace-types";
import { buttonClassName } from "@/components/ui/button";
import type { GenerationActionErrorPresentation } from "@/features/generations/client-wallet";
import type {
  VisualPromptEditorHandle,
  VisualPromptTool,
} from "@/features/visual-prompt/types";
import { apiData } from "@/lib/api/client";

type GenerationCanvasCardProps = {
  generation: WorkspaceGeneration;
  variantNumber: string;
  cancelPending?: boolean;
  retryPending?: boolean;
  actionError?: GenerationActionErrorPresentation | null;
  selected: boolean;
  editorRef: Ref<VisualPromptEditorHandle>;
  tool: VisualPromptTool;
  color: string;
  strokeWidth: number;
  onHistoryStateChange(state: { canUndo: boolean; canRedo: boolean }): void;
  onEditorError(message: string | null): void;
  onCancel(): void;
  onRetry(): void;
  onRemove(): void;
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

function CardHeader({
  variantNumber,
  status,
}: {
  variantNumber: string;
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
  editorRef,
  tool,
  color,
  strokeWidth,
  onHistoryStateChange,
  onEditorError,
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
    initialData: generation.resultUrl ?? undefined,
    staleTime: 8 * 60_000,
    refetchInterval: 8 * 60_000,
  });
  const resultUnavailable =
    generation.status === "SUCCEEDED" && !generation.resultUserId;
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
          {actionError ? <ActionErrorNotice error={actionError} /> : null}
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
            icon={
              <ImageOff size={30} className="text-muted" aria-hidden="true" />
            }
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
              alt={`Готовый интерьер, вариант ${variantNumber}`}
              className="size-full object-contain"
              draggable={false}
            />
            {selected &&
            generation.resultUser?.width &&
            generation.resultUser.height ? (
              <div className="absolute inset-0">
                <VisualPromptEditor
                  ref={editorRef}
                  editorWidth={generation.resultUser.width}
                  editorHeight={generation.resultUser.height}
                  sourceWidth={generation.resultUser.width}
                  sourceHeight={generation.resultUser.height}
                  initialState={null}
                  tool={tool}
                  color={color}
                  strokeWidth={strokeWidth}
                  onHistoryStateChange={onHistoryStateChange}
                  onPersistenceStateChange={onEditorError}
                />
              </div>
            ) : null}
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
            aria-label={`Убрать вариант ${variantNumber} с холста`}
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
              "rounded-xl disabled:opacity-40",
            )}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {retryPending ? "Повторяем…" : "Повторить"}
          </button>
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
          <button
            type="button"
            aria-label={`Убрать вариант ${variantNumber} с холста`}
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
              "rounded-xl disabled:opacity-40",
            )}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {retryPending ? "Запускаем…" : "Повторить"}
          </button>
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
        >
          <button
            type="button"
            aria-label={`Убрать вариант ${variantNumber} с холста`}
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
      <span
        className="sr-only"
        role={announcementIsError ? "alert" : "status"}
        aria-live={announcementIsError ? "assertive" : "polite"}
      >
        {announcement}
      </span>
      <CardHeader variantNumber={variantNumber} status={generation.status} />
      {content}
    </div>
  );
}
