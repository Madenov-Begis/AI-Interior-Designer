"use client";

import { ImageUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createLatestSourceUpload,
  isAcceptedSourceFile,
} from "@/features/upload-media";
import { projectsQueries } from "@/shared/api/projects";

type ReplaceState = "idle" | "uploading" | "error";

export function SourceReplaceControl({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploader] = useState(() => createLatestSourceUpload());
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ReplaceState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => uploader.abort();
  }, [uploader]);

  async function replaceSource(nextFile: File) {
    if (!isAcceptedSourceFile(nextFile)) {
      setState("error");
      setError("Выберите JPG, PNG или WEBP размером не более 15 МБ.");
      return;
    }

    setFile(nextFile);
    setState("uploading");
    setError(null);

    try {
      await uploader.upload(projectId, nextFile);
      setState("idle");
      await queryClient.invalidateQueries({
        queryKey: projectsQueries.workspace(projectId).queryKey,
      });
    } catch (uploadError) {
      if (
        uploadError instanceof DOMException &&
        uploadError.name === "AbortError"
      ) {
        return;
      }
      setState("error");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Не удалось заменить фотографию",
      );
    }
  }

  return (
    <div className="absolute top-3 left-3 z-20">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Выбрать новую фотографию помещения"
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          if (nextFile) void replaceSource(nextFile);
          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-black shadow-xl transition-colors hover:bg-surface-elevated disabled:cursor-wait disabled:opacity-70"
      >
        <ImageUp
          size={18}
          className={state === "uploading" ? "animate-pulse" : undefined}
          aria-hidden="true"
        />
        {state === "uploading" ? "Заменяем…" : "Заменить фото"}
      </button>
      {state === "error" && error ? (
        <div
          className="mt-2 max-w-72 rounded-xl border border-red-400/30 bg-surface p-3 text-xs text-red-300 shadow-xl"
          role="alert"
        >
          <p>{error}</p>
          {file ? (
            <button
              type="button"
              onClick={() => void replaceSource(file)}
              className="mt-2 min-h-9 font-bold text-foreground underline underline-offset-4"
            >
              Повторить
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
