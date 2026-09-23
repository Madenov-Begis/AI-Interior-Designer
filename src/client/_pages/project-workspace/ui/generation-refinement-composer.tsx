"use client";

import { ImagePlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

type Props = {
  generationId: string;
  userScope: string;
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
  const [prompt, setPrompt] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (loadRefinementDraft(window.localStorage, userScope, generationId)
          ?.prompt ?? ""),
  );
  const [files, setFiles] = useState<File[]>([]);
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
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
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
        <DialogHeader className="pr-8">
          <DialogTitle>{t("Опишите изменения")}</DialogTitle>
          <DialogDescription>
            {t("Изменится выбранный вариант. Добавятся только новая разметка и новые референсы")}
          </DialogDescription>
        </DialogHeader>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            event.preventDefault();
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
            placeholder={t("Например: сделай фасады темнее и добавь светильник из референса")}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-5 outline-none transition-colors focus:border-accent"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${file.lastModified}-${index}`}
                className="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-background px-2 py-1 text-xs"
              >
                {file.name}
                <button
                  type="button"
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  aria-label={t("Удалить файл {name}", { name: file.name })}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label
              className={buttonClassName(
                "secondary",
                "cursor-pointer rounded-xl",
              )}
            >
              <ImagePlus size={17} />
              {t("Референс")}
              <input
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
              className="ml-auto rounded-xl"
            >
              <ImagePlus size={17} aria-hidden="true" />
              {t("Создать доработку · {cost} кредита", {
                cost: generationCost ?? 4,
              })}
            </LoadingButton>
          </div>
          {files.length > 0 ? (
            <p className="mt-2 text-xs text-muted" aria-live="polite">
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
