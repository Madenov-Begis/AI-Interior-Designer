"use client";

import {
  ArrowLeft,
  ArrowRight,
  Link2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { apiData } from "@/lib/api/client";

export type ReferenceItem = {
  id: string;
  fileId: string;
  position: number;
  sourceUrl: string | null;
  previewUrl: string;
};

type Props = {
  projectId: string;
  initialReferences: ReferenceItem[];
  maxCount?: number;
  variant?: "section" | "compact";
};

export function ReferenceManager({
  projectId,
  initialReferences,
  maxCount = 10,
  variant = "section",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"files" | "urls">("files");
  const [addOpen, setAddOpen] = useState(false);
  const [references, setReferences] = useState(initialReferences);
  const [urls, setUrls] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Добавьте стиль, мебель, материалы или декор для будущего интерьера",
  );

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    if (references.length + files.length > maxCount)
      return setMessage(
        `Можно добавить ещё ${Math.max(0, maxCount - references.length)} изображений`,
      );
    setBusy(true);
    setMessage("Проверяем и загружаем референсы…");
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      const payload = await apiData<{ references: ReferenceItem[] }>({
        url: `/projects/${projectId}/references`,
        method: "POST",
        data: formData,
      });
      const added = payload.references;
      setReferences((current) => [...current, ...added]);
      setMessage(
        `Добавлено: ${added.length}. Всего ${references.length + added.length} из ${maxCount}`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить референсы",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function importUrls() {
    const values = urls
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!values.length || busy) return;
    if (references.length + values.length > maxCount)
      return setMessage(
        `Можно импортировать ещё ${Math.max(0, maxCount - references.length)} ссылок`,
      );
    setBusy(true);
    setMessage("Безопасно проверяем и импортируем ссылки…");
    try {
      const payload = await apiData<{
        results: Array<
          | {
              url: string;
              success: true;
              referenceId: string;
              fileId: string;
              previewUrl: string;
            }
          | { url: string; success: false; message: string }
        >;
      }>({
        url: `/projects/${projectId}/references/from-url`,
        method: "POST",
        data: { urls: values },
      });
      const successful = payload.results.filter(
        (item: { success: boolean }) => item.success,
      ) as Array<{
        url: string;
        referenceId: string;
        fileId: string;
        previewUrl: string;
      }>;
      const added = successful.map((item, index) => ({
        id: item.referenceId,
        fileId: item.fileId,
        sourceUrl: item.url,
        previewUrl: item.previewUrl,
        position: references.length + index,
      }));
      setReferences((current) => [...current, ...added]);
      const failed = payload.results.filter(
        (item: { success: boolean }) => !item.success,
      ) as Array<{ url: string; message: string }>;
      setMessage(
        failed.length
          ? `Добавлено ${added.length}; ошибок ${failed.length}: ${failed[0].message}`
          : `Добавлено ссылок: ${added.length}`,
      );
      if (!failed.length) setUrls("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось импортировать ссылки",
      );
    } finally {
      setBusy(false);
    }
  }

  async function persistOrder(
    next: ReferenceItem[],
    previous: ReferenceItem[],
  ) {
    setReferences(next.map((item, position) => ({ ...item, position })));
    try {
      await apiData({
        url: `/projects/${projectId}/references/reorder`,
        method: "PATCH",
        data: { referenceIds: next.map((item) => item.id) },
      });
      setMessage("Порядок референсов сохранён");
    } catch (error) {
      setReferences(previous);
      setMessage(
        error instanceof Error ? error.message : "Не удалось изменить порядок",
      );
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= references.length || busy) return;
    const previous = [...references];
    const next = [...references];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next, previous);
  }

  async function remove(referenceId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await apiData({
        url: `/projects/${projectId}/references/${referenceId}`,
        method: "DELETE",
      });
      setReferences((current) =>
        current
          .filter((item) => item.id !== referenceId)
          .map((item, position) => ({ ...item, position })),
      );
      setMessage("Референс удалён");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Не удалось удалить референс",
      );
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (!references.length || busy) return;
    setBusy(true);
    try {
      await apiData({
        url: `/projects/${projectId}/references`,
        method: "DELETE",
      });
      setReferences([]);
      setMessage("Все референсы удалены");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Не удалось очистить список",
      );
    } finally {
      setBusy(false);
    }
  }

  const hiddenFileInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      onChange={(event) => void uploadFiles(event.target.files)}
    />
  );

  if (variant === "compact") {
    return (
      <div className="mt-3">
        {hiddenFileInput}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {references.map((item, index) => (
            <article
              key={item.id}
              className="w-[136px] shrink-0 overflow-hidden rounded-xl border border-border bg-background"
            >
              <a
                href={item.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="block h-[92px] overflow-hidden bg-black"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={`Референс ${index + 1}`}
                  className="size-full object-cover"
                />
              </a>
              <div className="grid grid-cols-3 border-t border-border bg-surface">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || busy}
                  className="grid size-11 place-items-center text-muted transition-colors hover:bg-surface-elevated hover:text-foreground disabled:opacity-30"
                  aria-label="Переместить влево"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === references.length - 1 || busy}
                  className="grid size-11 place-items-center border-x border-border text-muted transition-colors hover:bg-surface-elevated hover:text-foreground disabled:opacity-30"
                  aria-label="Переместить вправо"
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  disabled={busy}
                  className="grid size-11 place-items-center text-red-300 transition-colors hover:bg-surface-elevated disabled:opacity-30"
                  aria-label="Удалить референс"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={() => setAddOpen((open) => !open)}
            disabled={busy || references.length >= maxCount}
            aria-expanded={addOpen}
            aria-controls="compact-reference-add"
            aria-label={`Добавить референс. Добавлено ${references.length} из ${maxCount}`}
            className="grid min-h-[137px] w-[92px] shrink-0 place-items-center rounded-xl border border-dashed border-muted bg-background text-center text-muted transition-colors hover:border-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>
              <Plus size={20} className="mx-auto" aria-hidden="true" />
              <span className="mt-1 block text-[10px] font-black">
                {references.length} / {maxCount}
              </span>
            </span>
          </button>
        </div>

        {addOpen && references.length < maxCount && (
          <div
            id="compact-reference-add"
            role="dialog"
            aria-label="Добавить референс"
            className="mt-2 rounded-xl border border-border bg-background p-3 shadow-xl"
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTab("files")}
                aria-pressed={tab === "files"}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black ${
                  tab === "files"
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-elevated text-muted"
                }`}
              >
                <Upload size={15} aria-hidden="true" />
                Файлы
              </button>
              <button
                type="button"
                onClick={() => setTab("urls")}
                aria-pressed={tab === "urls"}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black ${
                  tab === "urls"
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-elevated text-muted"
                }`}
              >
                <Link2 size={15} aria-hidden="true" />
                Ссылка
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-elevated hover:text-foreground"
                aria-label="Закрыть добавление референсов"
              >
                <X size={16} />
              </button>
            </div>

            {tab === "files" ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy || references.length >= maxCount}
                className={buttonClassName(
                  "secondary",
                  "mt-3 w-full rounded-lg border-dashed py-3 disabled:opacity-40",
                )}
              >
                <Upload size={16} aria-hidden="true" />
                Выбрать изображения
              </button>
            ) : (
              <div className="mt-3 grid gap-2">
                <textarea
                  value={urls}
                  onChange={(event) => setUrls(event.target.value)}
                  rows={3}
                  placeholder={
                    "https://example.com/product\nhttps://example.com/image.jpg"
                  }
                  className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-5 outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => void importUrls()}
                  disabled={busy || !urls.trim()}
                  className={buttonClassName(
                    "secondary",
                    "rounded-lg py-2 disabled:opacity-40",
                  )}
                >
                  Импортировать ссылки
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex items-start justify-between gap-3">
          <p
            className="min-h-5 text-xs leading-5 text-muted"
            aria-live="polite"
          >
            {busy ? "Обработка…" : message}
          </p>
          {references.length > 0 && (
            <button
              type="button"
              onClick={() => void clearAll()}
              disabled={busy}
              className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-bold text-red-300 hover:bg-surface-elevated hover:text-red-200 disabled:opacity-40"
            >
              Очистить
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-7 rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-accent uppercase">
            Шаг 2 из 3
          </p>
          <h2 className="mt-2 text-2xl font-black italic">Референсы</h2>
        </div>
        <span className="rounded-full bg-surface-elevated px-4 py-2 text-sm font-bold">
          {references.length} / {maxCount}
        </span>
      </div>

      <div className="mt-5 flex gap-2 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => setTab("files")}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "files" ? "bg-accent text-accent-foreground" : "bg-surface-elevated text-muted"}`}
        >
          Файлы
        </button>
        <button
          type="button"
          onClick={() => setTab("urls")}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "urls" ? "bg-accent text-accent-foreground" : "bg-surface-elevated text-muted"}`}
        >
          Ссылки
        </button>
      </div>

      {tab === "files" ? (
        <div className="mt-5">
          {hiddenFileInput}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || references.length >= maxCount}
            className={buttonClassName(
              "secondary",
              "w-full rounded-xl border-dashed py-5 disabled:opacity-40",
            )}
          >
            <Upload size={17} aria-hidden="true" />
            Выбрать изображения
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <textarea
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            rows={5}
            placeholder={
              "https://example.com/product\nhttps://example.com/image.jpg"
            }
            className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => void importUrls()}
            disabled={busy || !urls.trim()}
            className={buttonClassName(
              "secondary",
              "rounded-xl disabled:opacity-40",
            )}
          >
            Импортировать ссылки
          </button>
        </div>
      )}

      <p className="mt-4 rounded-xl bg-surface-elevated p-3 text-sm leading-6 text-muted">
        {busy ? "Обработка…" : message}
      </p>

      {references.length > 0 && (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {references.map((item, index) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <a
                  href={item.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-square overflow-hidden bg-black"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={`Референс ${index + 1}`}
                    className="size-full object-cover"
                  />
                </a>
                <div className="grid grid-cols-3 gap-1 p-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || busy}
                    className="grid place-items-center rounded-md bg-surface-elevated py-2 disabled:opacity-30"
                    aria-label="Переместить влево"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === references.length - 1 || busy}
                    className="grid place-items-center rounded-md bg-surface-elevated py-2 disabled:opacity-30"
                    aria-label="Переместить вправо"
                  >
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    disabled={busy}
                    className="grid place-items-center rounded-md bg-surface-elevated py-2 text-red-300"
                    aria-label="Удалить референс"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void clearAll()}
            disabled={busy}
            className="mt-4 text-sm font-bold text-red-300 hover:text-red-200"
          >
            Очистить весь список
          </button>
        </div>
      )}
    </section>
  );
}
