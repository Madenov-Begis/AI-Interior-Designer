"use client";

import { ImagePlus, LoaderCircle, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import {
  clearRefinementDraft,
  loadRefinementDraft,
  saveRefinementDraft,
} from "@/features/generations/refinement-draft";

type Props = {
  generationId: string;
  userScope: string;
  initialReferenceFileIds: string[];
  pending: boolean;
  error: string | null;
  onSubmit(input: {
    prompt: string;
    referenceFileIds: string[];
    files: File[];
  }): Promise<void>;
};

export function GenerationRefinementComposer({
  generationId,
  userScope,
  initialReferenceFileIds,
  pending,
  error,
  onSubmit,
}: Props) {
  const [prompt, setPrompt] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (loadRefinementDraft(
          window.localStorage,
          userScope,
          generationId,
        )?.prompt ?? ""),
  );
  const [referenceFileIds, setReferenceFileIds] = useState(
    initialReferenceFileIds,
  );
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    saveRefinementDraft(window.localStorage, userScope, generationId, {
      prompt,
      canvasState: null,
    });
  }, [generationId, prompt, userScope]);

  async function submit() {
    if (prompt.trim().length < 3 || pending) return;
    await onSubmit({ prompt, referenceFileIds, files });
    clearRefinementDraft(window.localStorage, userScope, generationId);
    setPrompt("");
    setFiles([]);
  }

  return (
    <div
      className="border-t border-border bg-surface p-4"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
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
      <label
        htmlFor={`refinement-prompt-${generationId}`}
        className="text-sm font-black text-accent"
      >
        Что изменить в этом варианте?
      </label>
      <textarea
        id={`refinement-prompt-${generationId}`}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Например: сделай фасады темнее и добавь светильник из референса"
        className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none focus:border-accent"
      />
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
        <label className={buttonClassName("secondary", "cursor-pointer rounded-xl")}>
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
          disabled={pending || prompt.trim().length < 3}
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
          {pending ? "Создаём…" : "Создать доработку"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
