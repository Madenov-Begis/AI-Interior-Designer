"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";

type UploadState = "idle" | "ready" | "uploading" | "success" | "error";

export function SourceUpload() {
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
    setMessage("Создаём проект и обрабатываем фотографию…");

    try {
      const projectResponse = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: file.name.replace(/\.[^.]+$/, "") || "Новый дизайн" }),
      });
      const projectPayload = await projectResponse.json();
      if (!projectResponse.ok) throw new Error(projectPayload.error?.message ?? "Не удалось создать проект");

      const formData = new FormData();
      formData.set("file", file);
      const uploadResponse = await fetch(`/api/v1/projects/${projectPayload.data.id}/source`, { method: "POST", body: formData });
      const uploadPayload = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadPayload.error?.message ?? "Не удалось загрузить фотографию");

      setState("success");
      setMessage("Фотография проверена и сохранена в приватном хранилище.");
      router.push(`/app/design/${projectPayload.data.id}`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить фотографию");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <section
        className="relative min-h-[460px] overflow-hidden rounded-2xl border border-dashed border-border bg-background"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}
      >
        {previewUrl ? (
          // The local blob URL exists only in the browser and is not optimized by Next Image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Предпросмотр загруженной комнаты" className="absolute inset-0 size-full object-contain" />
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="absolute inset-0 grid size-full cursor-pointer place-items-center p-6 text-center">
            <span><span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-3xl font-light text-accent-foreground">＋</span><b className="mt-5 block text-xl">Перетащите фотографию комнаты</b><span className="mt-2 block text-sm leading-6 text-muted">или нажмите, чтобы выбрать файл</span></span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
        {previewUrl && <button type="button" onClick={() => inputRef.current?.click()} className="absolute right-4 bottom-4 rounded-xl border border-white/15 bg-black/65 px-4 py-3 text-sm font-bold backdrop-blur">Заменить фото</button>}
      </section>

      <aside className="rounded-2xl border border-border bg-background p-5 sm:p-6">
        <p className="text-xs font-black tracking-[0.18em] text-accent uppercase">Шаг 1 из 3</p>
        <h2 className="mt-3 text-2xl font-black italic">Фото помещения</h2>
        <p className={`mt-4 min-h-12 text-sm leading-6 ${state === "error" ? "text-red-300" : state === "success" ? "text-accent" : "text-muted"}`}>{message}</p>
        <div className="mt-7 space-y-3 border-t border-border pt-6 text-sm text-muted"><p>✓ Проверим реальный тип файла</p><p>✓ Исправим EXIF-поворот</p><p>✓ Удалим лишние metadata</p><p>✓ Создадим быстрый preview</p></div>
        <button type="button" onClick={upload} disabled={!file || state === "uploading" || state === "success"} className={buttonClassName("primary", "mt-8 w-full rounded-xl disabled:cursor-not-allowed disabled:opacity-50")}>
          {state === "uploading" ? "Обрабатываем…" : state === "success" ? "Фото сохранено ✓" : "Сохранить и продолжить →"}
        </button>
      </aside>
    </div>
  );
}
