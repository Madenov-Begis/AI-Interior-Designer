"use client";

import { ImagePlus, LoaderCircle, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClassName } from "@/shared/ui";
import { generationWalletPresentation } from "@/features/generate-design";
import {
  clearRefinementDraft,
  loadRefinementDraft,
  saveRefinementDraft,
} from "@/features/generate-design";

type Props = {
  generationId: string;
  userScope: string;
  balance: number | null | undefined;
  generationCost: number | null | undefined;
  initialReferenceFileIds: string[];
  pending: boolean;
  error: string | null;
  errorCode: string | null;
  onClose(): void;
  onSubmit(input: {
    prompt: string;
    referenceFileIds: string[];
    files: File[];
  }): Promise<void>;
};

export function GenerationRefinementComposer({
  generationId,
  userScope,
  balance,
  generationCost,
  initialReferenceFileIds,
  pending,
  error,
  errorCode,
  onClose,
  onSubmit,
}: Props) {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (loadRefinementDraft(window.localStorage, userScope, generationId)
          ?.prompt ?? ""),
  );
  const [referenceFileIds, setReferenceFileIds] = useState(
    initialReferenceFileIds,
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

  useEffect(() => {
    const frame = requestAnimationFrame(() => promptRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || pending) return;
      event.preventDefault();
      onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, pending]);

  async function submit() {
    if (
      prompt.trim().length < 3 ||
      pending ||
      walletUnavailable ||
      walletPresentation.balanceInsufficient
    ) {
      return;
    }
    await onSubmit({ prompt, referenceFileIds, files });
    clearRefinementDraft(window.localStorage, userScope, generationId);
    setPrompt("");
    setFiles([]);
    onClose();
  }

  return (
    <section
      id="generation-refinement-popover"
      role="dialog"
      aria-labelledby={`refinement-title-${generationId}`}
      className="generation-refinement-popover"
      onPointerDown={(event) => event.stopPropagation()}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        setFiles((current) => [
          ...current,
          ...Array.from(event.dataTransfer.files).filter((file) =>
            ["image/jpeg", "image/png", "image/webp"].includes(file.type),
          ),
        ]);
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id={`refinement-title-${generationId}`}
            className="text-base font-black text-foreground"
          >
            Опишите изменения
          </h2>
          <p className="mt-1 text-xs text-muted">
            Разметка и новые референсы добавятся к запросу
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label="Закрыть редактор доработки"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>
      <label htmlFor={`refinement-prompt-${generationId}`} className="sr-only">
        Что изменить в этом варианте?
      </label>
      <textarea
        ref={promptRef}
        id={`refinement-prompt-${generationId}`}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Например: сделай фасады темнее и добавь светильник из референса"
        className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-5 outline-none transition-colors focus:border-accent"
      />
      <p
        className="-mt-7 mr-3 text-right text-xs text-muted"
        aria-live="polite"
      >
        {prompt.length} / 4000
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {referenceFileIds.map((fileId, index) => (
          <span
            key={fileId}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs"
          >
            Референс {index + 1}
            <button
              type="button"
              onClick={() =>
                setReferenceFileIds((current) =>
                  current.filter((id) => id !== fileId),
                )
              }
              aria-label={`Удалить референс ${index + 1}`}
            >
              <X size={13} />
            </button>
          </span>
        ))}
        {files.map((file, index) => (
          <span
            key={`${file.name}-${file.lastModified}`}
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
              aria-label={`Удалить файл ${file.name}`}
            >
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <label
          className={buttonClassName("secondary", "cursor-pointer rounded-xl")}
        >
          <ImagePlus size={17} />
          Референс
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) =>
              setFiles((current) => [
                ...current,
                ...Array.from(event.target.files ?? []),
              ])
            }
          />
        </label>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={
            pending ||
            prompt.trim().length < 3 ||
            walletUnavailable ||
            walletPresentation.balanceInsufficient
          }
          className={buttonClassName(
            "primary",
            "ml-auto rounded-xl disabled:opacity-45",
          )}
        >
          {pending ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Sparkles size={17} />
          )}
          {pending ? "Создаём…" : walletPresentation.buttonLabel}
        </button>
      </div>
      {walletPresentation.balanceInsufficient &&
      walletPresentation.disabledReason &&
      walletPresentation.purchaseLink ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {walletPresentation.disabledReason}{" "}
          <Link
            href={walletPresentation.purchaseLink.href}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            {walletPresentation.purchaseLink.label}
          </Link>
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
          {errorCode === "INSUFFICIENT_CREDITS" &&
          walletPresentation.purchaseLink ? (
            <>
              {" "}
              <Link
                href={walletPresentation.purchaseLink.href}
                className="font-semibold underline underline-offset-2"
              >
                {walletPresentation.purchaseLink.label}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
