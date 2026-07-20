"use client";

import { useRef, useState } from "react";
import { buttonClassName } from "@/components/ui/button";

export type ReferenceItem = {
  id: string;
  fileId: string;
  position: number;
  sourceUrl: string | null;
  previewUrl: string;
};

type Props = { projectId: string; initialReferences: ReferenceItem[]; maxCount?: number };

async function getSignedUrl(fileId: string) {
  const response = await fetch(`/api/v1/media/${fileId}/signed-url`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось открыть изображение");
  return payload.data.url as string;
}

export function ReferenceManager({ projectId, initialReferences, maxCount = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"files" | "urls">("files");
  const [references, setReferences] = useState(initialReferences);
  const [urls, setUrls] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Добавьте стиль, мебель, материалы или декор для будущего интерьера");

  async function hydrateRows(rows: Array<{ id: string; fileId: string; position: number; sourceUrl: string | null }>) {
    return Promise.all(rows.map(async (row) => ({ ...row, previewUrl: await getSignedUrl(row.fileId) })));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    if (references.length + files.length > maxCount) return setMessage(`Можно добавить ещё ${Math.max(0, maxCount - references.length)} изображений`);
    setBusy(true);
    setMessage("Проверяем и загружаем референсы…");
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      const response = await fetch(`/api/v1/projects/${projectId}/references`, { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось загрузить референсы");
      const added = await hydrateRows(payload.data.references);
      setReferences((current) => [...current, ...added]);
      setMessage(`Добавлено: ${added.length}. Всего ${references.length + added.length} из ${maxCount}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить референсы");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function importUrls() {
    const values = urls.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (!values.length || busy) return;
    if (references.length + values.length > maxCount) return setMessage(`Можно импортировать ещё ${Math.max(0, maxCount - references.length)} ссылок`);
    setBusy(true);
    setMessage("Безопасно проверяем и импортируем ссылки…");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/references/from-url`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: values }),
      });
      const payload = await response.json();
      if (!response.ok && response.status !== 207) throw new Error(payload.error?.message ?? "Не удалось импортировать ссылки");
      const successful = payload.data.results.filter((item: { success: boolean }) => item.success) as Array<{ url: string; referenceId: string; fileId: string }>;
      const added = await hydrateRows(successful.map((item, index) => ({ id: item.referenceId, fileId: item.fileId, sourceUrl: item.url, position: references.length + index })));
      setReferences((current) => [...current, ...added]);
      const failed = payload.data.results.filter((item: { success: boolean }) => !item.success) as Array<{ url: string; message: string }>;
      setMessage(failed.length ? `Добавлено ${added.length}; ошибок ${failed.length}: ${failed[0].message}` : `Добавлено ссылок: ${added.length}`);
      if (!failed.length) setUrls("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось импортировать ссылки");
    } finally {
      setBusy(false);
    }
  }

  async function persistOrder(next: ReferenceItem[], previous: ReferenceItem[]) {
    setReferences(next.map((item, position) => ({ ...item, position })));
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/references/reorder`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ referenceIds: next.map((item) => item.id) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось изменить порядок");
      setMessage("Порядок референсов сохранён");
    } catch (error) {
      setReferences(previous);
      setMessage(error instanceof Error ? error.message : "Не удалось изменить порядок");
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
      const response = await fetch(`/api/v1/projects/${projectId}/references/${referenceId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось удалить референс");
      setReferences((current) => current.filter((item) => item.id !== referenceId).map((item, position) => ({ ...item, position })));
      setMessage("Референс удалён");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить референс");
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (!references.length || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/references`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось очистить список");
      setReferences([]);
      setMessage("Все референсы удалены");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось очистить список");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-7 rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black tracking-[0.18em] text-accent uppercase">Шаг 2 из 3</p><h2 className="mt-2 text-2xl font-black italic">Референсы</h2></div>
        <span className="rounded-full bg-surface-elevated px-4 py-2 text-sm font-bold">{references.length} / {maxCount}</span>
      </div>

      <div className="mt-5 flex gap-2 border-b border-border pb-4">
        <button type="button" onClick={() => setTab("files")} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "files" ? "bg-accent text-accent-foreground" : "bg-surface-elevated text-muted"}`}>Файлы</button>
        <button type="button" onClick={() => setTab("urls")} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "urls" ? "bg-accent text-accent-foreground" : "bg-surface-elevated text-muted"}`}>Ссылки</button>
      </div>

      {tab === "files" ? (
        <div className="mt-5">
          <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadFiles(event.target.files)} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy || references.length >= maxCount} className={buttonClassName("secondary", "w-full rounded-xl border-dashed py-5 disabled:opacity-40")}>＋ Выбрать изображения</button>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <textarea value={urls} onChange={(event) => setUrls(event.target.value)} rows={5} placeholder={"https://example.com/product\nhttps://example.com/image.jpg"} className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent" />
          <button type="button" onClick={() => void importUrls()} disabled={busy || !urls.trim()} className={buttonClassName("secondary", "rounded-xl disabled:opacity-40")}>Импортировать ссылки</button>
        </div>
      )}

      <p className="mt-4 rounded-xl bg-surface-elevated p-3 text-sm leading-6 text-muted">{busy ? "Обработка…" : message}</p>

      {references.length > 0 && (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {references.map((item, index) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                <a href={item.previewUrl} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt={`Референс ${index + 1}`} className="size-full object-cover" />
                </a>
                <div className="grid grid-cols-3 gap-1 p-2">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0 || busy} className="rounded-md bg-surface-elevated py-2 disabled:opacity-30" aria-label="Переместить влево">←</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === references.length - 1 || busy} className="rounded-md bg-surface-elevated py-2 disabled:opacity-30" aria-label="Переместить вправо">→</button>
                  <button type="button" onClick={() => void remove(item.id)} disabled={busy} className="rounded-md bg-surface-elevated py-2 text-red-300" aria-label="Удалить референс">×</button>
                </div>
              </article>
            ))}
          </div>
          <button type="button" onClick={() => void clearAll()} disabled={busy} className="mt-4 text-sm font-bold text-red-300 hover:text-red-200">Очистить весь список</button>
        </div>
      )}
    </section>
  );
}
