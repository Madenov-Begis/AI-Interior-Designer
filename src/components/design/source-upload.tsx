"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import {
  isAcceptedSourceFile,
  sourceProjectName,
  uploadProjectSource,
} from "@/features/media/source-upload-client";

type UploadState = "idle" | "uploading" | "success" | "error";

type SourceUploadProps = {
  projectId: string;
  initialProjectName: string;
};

const SOURCE_REQUIREMENTS =
  "JPG, PNG или WEBP · до 15 МБ · минимум 512 × 512 px";

export function SourceUpload({
  projectId,
  initialProjectName,
}: SourceUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController>(null);
  const previewUrlRef = useRef<string>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState(SOURCE_REQUIREMENTS);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function showPreview(nextFile: File) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const nextPreviewUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
  }

  async function startUpload(nextFile: File) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState("uploading");
    setMessage("Загружаем и обрабатываем фотографию…");

    try {
      await uploadProjectSource({
        projectId,
        file: nextFile,
        signal: controller.signal,
      });

      if (requestId !== requestIdRef.current) return;

      const derivedName = sourceProjectName(nextFile.name);
      if (
        initialProjectName === "Новый интерьер" &&
        derivedName !== initialProjectName
      ) {
        await fetch(`/api/v1/projects/${projectId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: derivedName }),
        }).catch(() => undefined);
      }

      if (requestId !== requestIdRef.current) return;
      setState("success");
      setMessage("Фото готово. Открываем инструменты…");
      router.refresh();
    } catch (error) {
      if (
        requestId !== requestIdRef.current ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        return;
      }
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить фотографию",
      );
    }
  }

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    if (!isAcceptedSourceFile(nextFile)) {
      setState("error");
      setMessage("Выберите JPG, PNG или WEBP размером не более 15 МБ.");
      return;
    }

    setFile(nextFile);
    showPreview(nextFile);
    void startUpload(nextFile);
  }

  return (
    <div
      className="relative size-full min-h-[420px] overflow-hidden bg-background"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        chooseFile(event.dataTransfer.files[0]);
      }}
    >
      {previewUrl ? (
        // The local blob URL exists only in the browser and is not optimized by Next Image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Предпросмотр загруженной комнаты"
          className="absolute inset-0 size-full object-contain"
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="page-grid absolute inset-0 grid size-full cursor-pointer place-items-center p-6 text-center transition-colors hover:bg-surface-elevated/30"
        >
          <span>
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-3xl font-light text-accent-foreground">
              ＋
            </span>
            <b className="mt-5 block text-xl sm:text-2xl">
              Загрузите фотографию комнаты
            </b>
            <span className="mt-2 block text-sm leading-6 text-muted">
              Перетащите файл прямо на холст или нажмите, чтобы выбрать
            </span>
            <span className="mt-1 block text-xs text-muted">
              {SOURCE_REQUIREMENTS}
            </span>
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Выбрать фотографию помещения"
        onChange={(event) => {
          chooseFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      {state === "uploading" ? (
        <div
          className="absolute inset-0 grid place-items-center bg-black/45 p-6 text-center backdrop-blur-[2px]"
          role="status"
        >
          <div className="rounded-2xl border border-white/10 bg-black/70 px-6 py-5 shadow-2xl">
            <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-white/25 border-t-accent" />
            <b className="mt-4 block">Обрабатываем фото</b>
            <span className="mt-1 block text-sm text-white/65">
              Холст откроется автоматически
            </span>
          </div>
        </div>
      ) : null}

      {state === "error" ? (
        <div
          className="absolute right-4 bottom-4 left-4 flex flex-col gap-3 rounded-2xl border border-red-300/20 bg-black/80 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p className="text-sm text-red-200">{message}</p>
          <div className="flex shrink-0 gap-2">
            {file ? (
              <button
                type="button"
                onClick={() => void startUpload(file)}
                className={buttonClassName("secondary", "rounded-xl")}
              >
                Повторить
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={buttonClassName("primary", "rounded-xl")}
            >
              Выбрать другое
            </button>
          </div>
        </div>
      ) : null}

      {state === "success" ? (
        <div
          className="absolute right-4 bottom-4 rounded-xl border border-accent/25 bg-black/75 px-4 py-3 text-sm font-bold text-accent backdrop-blur"
          role="status"
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
