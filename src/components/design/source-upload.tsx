"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import {
  isAcceptedSourceFile,
  uploadProjectSource,
} from "@/features/media/source-upload-client";

type UploadState = "idle" | "uploading" | "error";

type SourceUploadProps = {
  projectId: string;
};

export function SourceUpload({ projectId }: SourceUploadProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  async function startUpload(nextFile: File) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState("uploading");
    setMessage("");

    try {
      await uploadProjectSource({
        projectId,
        file: nextFile,
        signal: controller.signal,
      });

      if (requestId !== requestIdRef.current) return;

      if (requestId !== requestIdRef.current) return;
      await queryClient.invalidateQueries({
        queryKey: ["workspace", projectId],
      });
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
    void startUpload(nextFile);
  }

  return (
    <div
      className="page-grid relative size-full min-h-[420px] overflow-hidden bg-background"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        chooseFile(event.dataTransfer.files[0]);
      }}
    >
      <div className="absolute inset-0 grid place-items-center p-6">
        <div className="w-full max-w-[340px]">
          <div className="mb-3 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-full bg-secondary text-sm font-bold text-muted-foreground">
              01
            </span>
            <p className="mt-2 text-xs font-semibold">Фото комнаты</p>
          </div>
          <button
            type="button"
            disabled={state === "uploading"}
            onClick={() => inputRef.current?.click()}
            className="group flex aspect-[4/5] w-full cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-card p-7 text-center shadow-2xl shadow-black/25 transition-colors hover:border-primary hover:bg-[#28282a] disabled:cursor-wait disabled:border-primary/45 disabled:hover:bg-card"
          >
            <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-disabled:bg-primary/10 group-disabled:text-primary">
              {state === "uploading" ? (
                <LoaderCircle
                  className="size-6 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ImagePlus className="size-6" aria-hidden="true" />
              )}
            </span>
            <b className="mt-5 block text-lg">
              {state === "uploading"
                ? "Загружаем фото…"
                : "Загрузите фото комнаты"}
            </b>
            <span className="mt-2 block text-sm leading-6 text-muted-foreground">
              {state === "uploading"
                ? "После загрузки сразу откроются холст и настройки"
                : "Перетащите файл сюда или нажмите, чтобы выбрать"}
            </span>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <UploadCloud className="size-3.5" aria-hidden="true" />
              JPG, PNG или WEBP · до 15 МБ
            </span>
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Фото появится прямо на холсте
          </p>
        </div>
      </div>

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

      <p className="sr-only" aria-live="polite">
        {state === "uploading"
          ? "Фотография загружается. После загрузки откроется холст."
          : ""}
      </p>
    </div>
  );
}
