"use client";

import { Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { downloadWorkspaceGeneration } from "../api/workspace-generation-download";
import type { WorkspaceGeneration } from "../model/workspace-types";
import { LoadingButton } from "@/shared/ui";

export type ResultActionsProps = {
  generation: WorkspaceGeneration;
  resultUrl: string;
  onClose(): void;
};

function formatCreationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export function ResultActions({
  generation,
  resultUrl,
  onClose,
}: ResultActionsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [downloadPending, setDownloadPending] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  async function downloadResult() {
    setDownloadPending(true);
    setDownloadError(null);
    try {
      await downloadWorkspaceGeneration(generation.id);
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Не удалось скачать результат",
      );
    } finally {
      setDownloadPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="result-actions-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => {
        onClose();
        const returnFocus = returnFocusRef.current;
        if (returnFocus?.isConnected) {
          requestAnimationFrame(() => returnFocus.focus());
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 z-[70] m-0 h-dvh max-h-dvh w-full max-w-none overflow-y-auto border-0 bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/75 md:inset-y-8 md:m-auto md:h-auto md:max-h-[calc(100dvh-4rem)] md:w-[min(960px,calc(100vw-3rem))] md:rounded-3xl md:border md:border-border"
    >
      <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-surface/95 px-5 pt-[env(safe-area-inset-top)] backdrop-blur md:pt-0">
        <div>
          <h2 id="result-actions-title" className="text-base font-black">
            Результат генерации
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          className="grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
          aria-label="Закрыть результат"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex max-h-[65dvh] min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-border bg-black">
          {/* Signed result URLs are short lived and intentionally bypass image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="Готовый интерьер"
            className="max-h-[65dvh] max-w-full object-contain"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <LoadingButton
          onClick={() => void downloadResult()}
          pending={downloadPending}
          pendingText="Подготавливаем…"
          variant="primary"
          size="sm"
          className="justify-self-center rounded-lg text-center"
        >
          <Download size={17} aria-hidden="true" />
          Скачать изображение
        </LoadingButton>
        {downloadError ? (
          <p role="alert" className="text-sm text-red-300">
            {downloadError}
          </p>
        ) : null}

        <section
          className="rounded-2xl border border-border bg-surface-elevated p-5"
          aria-labelledby="result-details-title"
        >
          <h3 id="result-details-title" className="text-sm font-black">
            Детали генерации
          </h3>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Формат
              </dt>
              <dd className="mt-1 font-medium">{generation.aspectRatio}</dd>
            </div>
            {generation.resultUser?.width && generation.resultUser.height ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Разрешение
                </dt>
                <dd className="mt-1 font-medium">
                  {generation.resultUser.width} × {generation.resultUser.height}
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Описание
              </dt>
              <dd className="mt-1 whitespace-pre-wrap leading-6">
                {generation.prompt}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Создано
              </dt>
              <dd className="mt-1 font-medium">
                {formatCreationDate(generation.createdAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </dialog>
  );
}
