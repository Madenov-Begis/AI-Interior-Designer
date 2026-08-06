"use client";

import { Download, LoaderCircle, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BeforeAfter } from "./before-after";
import type { WorkspaceGeneration } from "../model/workspace-types";
import { buttonClassName } from "@/shared/ui";
import {
  type GenerationActionErrorPresentation,
  generationActionErrorPresentation,
} from "@/features/generate-design";

export type ResultActionsProps = {
  generation: WorkspaceGeneration;
  sourceUrl: string;
  resultUrl: string;
  onClose(): void;
  onGenerateVariation(): Promise<void>;
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
  sourceUrl,
  resultUrl,
  onClose,
  onGenerateVariation,
}: ResultActionsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [variationPending, setVariationPending] = useState(false);
  const [variationError, setVariationError] =
    useState<GenerationActionErrorPresentation | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function close() {
    if (variationPending) return;
    dialogRef.current?.close();
  }

  async function generateVariation() {
    setVariationError(null);
    setVariationPending(true);
    try {
      await onGenerateVariation();
      setVariationPending(false);
      dialogRef.current?.close();
    } catch (error) {
      setVariationError(generationActionErrorPresentation(error, "variation"));
      setVariationPending(false);
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
            Сравнение результата
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          disabled={variationPending}
          className="grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
          aria-label="Закрыть сравнение"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        <BeforeAfter beforeUrl={sourceUrl} afterUrl={resultUrl} />

        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={`/api/v1/generations/${generation.id}/download`}
            className={buttonClassName("secondary", "rounded-xl text-center")}
          >
            <Download size={17} aria-hidden="true" />
            Скачать результат
          </a>
          <button
            type="button"
            onClick={() => void generateVariation()}
            disabled={variationPending}
            className={buttonClassName(
              "primary",
              "rounded-xl disabled:cursor-wait disabled:opacity-50",
            )}
          >
            {variationPending ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Sparkles size={17} aria-hidden="true" />
            )}
            {variationPending ? "Создаём вариант…" : "Создать ещё вариант"}
          </button>
        </div>
        {variationError ? (
          <p role="alert" aria-live="polite" className="text-sm text-red-300">
            {variationError.message}
            {variationError.purchaseLink ? (
              <>
                {" "}
                <Link
                  href={variationError.purchaseLink.href}
                  className="font-semibold underline underline-offset-2"
                >
                  {variationError.purchaseLink.label}
                </Link>
              </>
            ) : null}
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
