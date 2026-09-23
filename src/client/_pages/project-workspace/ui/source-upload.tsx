"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { Button } from "@/shared/ui";
import {
  isAcceptedSourceFile,
  uploadProjectSource,
} from "@/features/upload-media";
import { projectsQueries } from "@/shared/api/projects";
import { useAppText } from "@/shared/providers";

type UploadState = "idle" | "uploading" | "complete" | "error";

export function SourceUpload({ projectId }: { projectId: string }) {
  const t = useAppText();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseButtonRef = useRef<HTMLButtonElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const dragDepthRef = useRef(0);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [errorKind, setErrorKind] = useState<"validation" | "upload" | null>(
    null,
  );
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function selectFile(nextFile?: File) {
    if (!nextFile || state === "uploading" || state === "complete") return;
    if (!isAcceptedSourceFile(nextFile)) {
      setState("error");
      setErrorKind("validation");
      setMessage(t("Выберите JPG, PNG или WEBP размером не более 15 МБ."));
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(nextFile);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setFile(nextFile);
    setState("idle");
    setErrorKind(null);
    setMessage("");
    setUploadProgress(null);
    requestAnimationFrame(() => uploadButtonRef.current?.focus());
  }

  function clearFile() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setFile(null);
    setState("idle");
    setErrorKind(null);
    setMessage("");
    setUploadProgress(null);
    requestAnimationFrame(() => chooseButtonRef.current?.focus());
  }

  async function startUpload() {
    if (!file || state === "uploading" || state === "complete") return;
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setState("uploading");
    setErrorKind(null);
    setUploadProgress(0);
    setMessage("");

    try {
      await uploadProjectSource({
        projectId,
        file,
        signal: controller.signal,
        onProgress: (progress) => {
          if (requestId === requestIdRef.current) setUploadProgress(progress);
        },
      });
      if (requestId !== requestIdRef.current) return;
      await queryClient.invalidateQueries({
        queryKey: projectsQueries.workspace(projectId).queryKey,
      });
      if (requestId !== requestIdRef.current) return;
      setState("complete");
      setUploadProgress(null);
    } catch (error) {
      if (
        requestId !== requestIdRef.current ||
        (error instanceof DOMException && error.name === "AbortError")
      )
        return;
      setState("error");
      setErrorKind("upload");
      setUploadProgress(null);
      setMessage(
        error instanceof Error
          ? error.message
          : t("Не удалось загрузить фотографию"),
      );
    } finally {
      if (requestId === requestIdRef.current) controllerRef.current = null;
    }
  }

  function cancelUpload() {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState("idle");
    setErrorKind(null);
    setUploadProgress(null);
    setMessage("");
  }

  const busy = state === "uploading" || state === "complete";
  const progressPercent = Math.round((uploadProgress ?? 0) * 100);

  return (
    <div
      className="flex size-full min-h-[280px] items-center justify-center overflow-y-auto px-4 py-6"
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepthRef.current += 1;
        if (!busy) setDragOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = busy ? "none" : "copy";
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepthRef.current = 0;
        setDragOver(false);
        if (!busy) selectFile(event.dataTransfer.files[0]);
      }}
    >
      <div className="w-full max-w-[400px] rounded-[18px] border border-border bg-card p-5 shadow-lg shadow-black/10 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ImagePlus className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-6 tracking-tight">
              {t("Фото комнаты")}
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {t("Добавьте снимок, чтобы начать работу на холсте")}
            </p>
          </div>
        </div>

        {!file || dragOver ? (
          <div
            className={`mt-5 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/10"
                : "border-border bg-background/50"
            }`}
          >
            <Upload className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">
              {dragOver
                ? t("Отпустите фото для загрузки")
                : t("Перетащите фото сюда")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("или выберите файл на устройстве")}
            </p>
            {!dragOver ? (
              <Button
                ref={chooseButtonRef}
                variant="primary"
                className="mt-4 min-h-11"
                onClick={() => inputRef.current?.click()}
              >
                {t("Выбрать фото")}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt={t("Выбранное фото комнаты")}
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={file.name}>
                {file.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("{size} МБ", {
                  size: Math.max(0.1, file.size / 1024 / 1024).toFixed(1),
                })}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {state === "uploading"
                  ? uploadProgress !== null && uploadProgress >= 1
                    ? t("Проверяем фотографию…")
                    : t("Загружаем фото")
                  : state === "complete"
                    ? t("Фото загружено. Открываем холст…")
                    : t("Фото готово к загрузке")}
              </p>
            </div>
            {!busy ? (
              <button
                type="button"
                onClick={clearFile}
                aria-label={t("Убрать выбранное фото")}
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          {t("JPG, PNG или WEBP · до 15 МБ")}
        </p>

        {state === "uploading" ? (
          <div
            className="mt-4"
            role="progressbar"
            aria-label={t("Загрузка фотографии")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-right text-xs tabular-nums text-muted-foreground">
              {progressPercent}%
            </p>
          </div>
        ) : null}

        {state === "error" ? (
          <p
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-5 text-foreground"
            role="alert"
          >
            {message}
          </p>
        ) : null}

        {file && !dragOver ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              ref={uploadButtonRef}
              variant="primary"
              className="min-h-11 flex-1"
              disabled={busy}
              onClick={() => void startUpload()}
            >
              {state === "uploading" ? (
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : state === "complete" ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {state === "uploading"
                ? t("Загружаем фото")
                : state === "complete"
                  ? t("Фото загружено")
                  : state === "error" && errorKind === "upload"
                    ? t("Попробовать загрузить ещё раз")
                    : t("Загрузить фото")}
            </Button>
            {state === "uploading" ? (
              <Button
                variant="secondary"
                className="min-h-11"
                onClick={cancelUpload}
              >
                {t("Отменить")}
              </Button>
            ) : state !== "complete" ? (
              <Button
                variant="secondary"
                className="min-h-11"
                onClick={() => inputRef.current?.click()}
              >
                {t("Заменить")}
              </Button>
            ) : null}
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label={t("Выбрать фотографию помещения")}
          onChange={(event) => {
            selectFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <p className="sr-only" aria-live="polite">
          {state === "uploading"
            ? t("Фотография загружается")
            : state === "complete"
              ? t("Фотография загружена и проверяется.")
              : file && state === "idle"
                ? t("Фото готово к загрузке")
                : ""}
        </p>
      </div>
    </div>
  );
}
