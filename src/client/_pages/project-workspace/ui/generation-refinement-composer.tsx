"use client";

import { ImagePlus, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buttonClassName,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  LoadingButton,
} from "@/shared/ui";
import { generationWalletPresentation } from "@/features/generate-design";
import {
  clearRefinementDraft,
  loadRefinementDraft,
  saveRefinementDraft,
} from "@/features/generate-design";
import { useAppText } from "@/shared/providers";

const INSPIRATION_CHIPS = [
  "Заменить мебель",
  "Другой цвет стен",
  "Сделать свет теплее",
  "Добавить зелень",
  "Поменять текстиль",
  "Больше дерева",
];

type Props = {
  generationId: string;
  userScope: string;
  variantNumber?: string;
  resultUrl?: string;
  balance: number | null | undefined;
  generationCost: number | null | undefined;
  pending: boolean;
  error: string | null;
  errorCode: string | null;
  onClose(): void;
  onSubmit(input: { prompt: string; files: File[] }): Promise<void>;
};

export function GenerationRefinementComposer({
  generationId,
  userScope,
  variantNumber,
  resultUrl,
  balance,
  generationCost,
  pending,
  error,
  errorCode,
  onClose,
  onSubmit,
}: Props) {
  const t = useAppText();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const fileInputId = useId();
  const [prompt, setPrompt] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (loadRefinementDraft(window.localStorage, userScope, generationId)
          ?.prompt ?? ""),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Генерируем безопасные object URLs для предпросмотра картинок референсов
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const wallet =
    typeof balance === "number" && typeof generationCost === "number"
      ? { balance, generationCost }
      : undefined;
  const walletPresentation = generationWalletPresentation(
    wallet,
    "refinement",
    errorCode,
  );
  const walletUnavailable = wallet === undefined;

  useEffect(() => {
    saveRefinementDraft(window.localStorage, userScope, generationId, {
      prompt,
      canvasState: null,
    });
  }, [generationId, prompt, userScope]);

  function applyChip(chipLabel: string) {
    const text = t(chipLabel);
    setPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      if (trimmed.toLowerCase().includes(text.toLowerCase())) return prev;
      return `${trimmed}, ${text.toLowerCase()}`;
    });
    promptRef.current?.focus();
  }

  async function submit() {
    if (
      pending ||
      walletUnavailable ||
      walletPresentation.balanceInsufficient
    ) {
      return;
    }
    try {
      await onSubmit({ prompt, files });
      clearRefinementDraft(window.localStorage, userScope, generationId);
      setPrompt("");
      setFiles([]);
      onClose();
    } catch {
      // The mutation owns the visible error. Keep the draft and files for retry.
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        id="generation-refinement-dialog"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg rounded-2xl border-border bg-surface p-6 shadow-2xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          promptRef.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader className="pr-8 text-left">
          <div className="flex items-start gap-3">
            {resultUrl ? (
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-background shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultUrl}
                  alt={t("Готовый интерьер")}
                  className="size-full object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-foreground">
                {variantNumber
                  ? t("Доработка варианта {number}", { number: variantNumber })
                  : t("Опишите изменения")}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {t(
                  "Изменится выбранный вариант. Добавятся только новая разметка и новые референсы",
                )}
              </DialogDescription>
            </div>
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1.5 self-start rounded-lg border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            <Sparkles size={13} aria-hidden="true" />
            {t("Разметка на холсте будет учтена")}
          </div>
        </DialogHeader>

        <div
          className={`relative mt-1 rounded-xl transition-all ${
            isDragging
              ? "rounded-xl border-2 border-dashed border-accent bg-accent/5 p-2"
              : ""
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            setFiles((current) =>
              [
                ...current,
                ...Array.from(event.dataTransfer.files).filter((file) =>
                  ["image/jpeg", "image/png", "image/webp"].includes(file.type),
                ),
              ].slice(0, 10),
            );
          }}
        >
          <label
            htmlFor={`refinement-prompt-${generationId}`}
            className="sr-only"
          >
            {t("Что изменить в этом варианте?")}
          </label>
          <textarea
            ref={promptRef}
            id={`refinement-prompt-${generationId}`}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            placeholder={t(
              "Например: сделай фасады темнее и добавь светильник из референса",
            )}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-5 outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
          />

          {/* Быстрые подсказки-чипсы для вдохновения */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {INSPIRATION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => applyChip(chip)}
                className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:bg-surface-elevated hover:text-foreground"
              >
                {t(chip)}
              </button>
            ))}
          </div>

          {/* Визуальная галерея загруженных референсов */}
          {previews.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {previews.map((item, index) => (
                <div
                  key={`${item.file.name}-${item.file.lastModified}-${index}`}
                  className="group relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-background shadow-xs transition-transform hover:scale-105"
                  title={item.file.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.file.name}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/75 text-white/90 shadow-xs transition-colors hover:bg-red-500 hover:text-white"
                    aria-label={t("Удалить файл {name}", {
                      name: item.file.name,
                    })}
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Панель действий: референс, баланс и запуск */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label
              htmlFor={fileInputId}
              className={buttonClassName(
                "secondary",
                "h-10 cursor-pointer rounded-xl px-3 text-xs gap-1.5",
              )}
            >
              <ImagePlus size={16} />
              {t("Референс")}
              <input
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  setFiles((current) => [...current, ...selected].slice(0, 10));
                  event.target.value = "";
                }}
              />
            </label>

            {typeof balance === "number" ? (
              <span className="text-xs text-muted-foreground ml-1">
                {t("Баланс: {balance} кр.", { balance })}
              </span>
            ) : null}

            <LoadingButton
              onClick={() => void submit()}
              disabled={
                pending ||
                walletUnavailable ||
                walletPresentation.balanceInsufficient
              }
              pending={pending}
              pendingText={t("Создаём…")}
              variant="primary"
              className="ml-auto rounded-xl h-10 px-4 text-xs font-semibold"
            >
              <ImagePlus size={16} aria-hidden="true" />
              {t("Создать доработку · {cost} кредита", {
                cost: generationCost ?? 4,
              })}
            </LoadingButton>
          </div>

          {files.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {t("Новые референсы: {count} из 10", { count: files.length })}
            </p>
          ) : null}

          {walletPresentation.balanceInsufficient &&
          walletPresentation.disabledReason &&
          walletPresentation.purchaseLink ? (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              {t(walletPresentation.disabledReason)}{" "}
              <Link
                href={walletPresentation.purchaseLink.href}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {t(walletPresentation.purchaseLink.label)}
              </Link>
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-red-300" role="alert">
              {t(error)}
              {errorCode === "INSUFFICIENT_CREDITS" &&
              walletPresentation.purchaseLink ? (
                <>
                  {" "}
                  <Link
                    href={walletPresentation.purchaseLink.href}
                    className="font-semibold underline underline-offset-2"
                  >
                    {t(walletPresentation.purchaseLink.label)}
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
