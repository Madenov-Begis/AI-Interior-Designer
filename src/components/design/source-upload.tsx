"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";

type UploadState = "idle" | "ready" | "uploading" | "success" | "error";

type SourceUploadProps = {
  projectId: string;
  initialProjectName: string;
};

export function SourceUpload({
  projectId,
  initialProjectName,
}: SourceUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("JPG, PNG или WEBP · до 15 МБ · минимум 512 × 512 px");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setState("ready");
    setMessage(`${nextFile.name} · ${(nextFile.size / 1024 / 1024).toFixed(1)} МБ`);
  }

  async function upload() {
    if (!file || state === "uploading") return;
    setState("uploading");
    setMessage("Проверяем и обрабатываем фотографию…");

    try {
      const formData = new FormData();
      formData.set("file", file);
      const uploadResponse = await fetch(
        `/api/v1/projects/${projectId}/source`,
        {
          method: "POST",
          body: formData,
        },
      );
      const uploadPayload = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(
          uploadPayload.error?.message ?? "Не удалось загрузить фотографию",
        );
      }

      const derivedName =
        file.name.replace(/\.[^.]+$/, "").trim().slice(0, 120) ||
        "Новый интерьер";
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

      setState("success");
      setMessage("Фотография проверена и сохранена.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить фотографию",
      );
    }
  }

  return (
    <div className="w-full max-w-[820px] rounded-3xl border border-border bg-surface p-3 shadow-2xl shadow-black/30 sm:p-5">
      <section
        className="relative min-h-[360px] overflow-hidden rounded-2xl border border-dashed border-border bg-background sm:min-h-[480px]"
        onDragOver={(event) => event.preventDefault()}
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
            className="absolute inset-0 grid size-full cursor-pointer place-items-center p-6 text-center transition-colors hover:bg-surface-elevated/40"
          >
            <span>
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-3xl font-light text-accent-foreground">
                ＋
              </span>
              <b className="mt-5 block text-xl sm:text-2xl">
                Загрузите фотографию комнаты
              </b>
              <span className="mt-2 block text-sm leading-6 text-muted">
                Перетащите файл сюда или нажмите, чтобы выбрать
              </span>
              <span className="mt-1 block text-xs text-muted">
                JPG, PNG или WEBP · до 15 МБ · минимум 512 × 512 px
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
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        {previewUrl ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={state === "uploading" || state === "success"}
            className="absolute right-4 bottom-4 rounded-xl border border-white/15 bg-black/65 px-4 py-3 text-sm font-bold backdrop-blur disabled:opacity-50"
          >
            Заменить фото
          </button>
        ) : null}
      </section>

      <div className="flex flex-col gap-4 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`min-h-6 text-sm leading-6 ${
            state === "error"
              ? "text-red-300"
              : state === "success"
                ? "text-accent"
                : "text-muted"
          }`}
          role={state === "error" ? "alert" : "status"}
        >
          {message}
        </p>
        <button
          type="button"
          onClick={upload}
          disabled={!file || state === "uploading" || state === "success"}
          className={buttonClassName(
            "primary",
            "w-full shrink-0 rounded-xl disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto",
          )}
        >
          {state === "uploading"
            ? "Обрабатываем…"
            : state === "success"
              ? "Фото сохранено ✓"
              : "Сохранить фото"}
        </button>
      </div>
    </div>
  );
}
