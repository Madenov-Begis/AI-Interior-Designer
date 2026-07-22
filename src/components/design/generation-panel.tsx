"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buttonClassName } from "@/components/ui/button";
import { BeforeAfter } from "@/components/design/before-after";

type Props = { projectId: string; sourceUrl: string; initialPrompt?: string | null; initialAspectRatio?: string };
type Model = { code: string; name: string; description: string | null; supportedAspectRatios: string[] };
type Generation = { id: string; status: string; resultUserId: string | null; errorCode: string | null; errorMessage: string | null; durationMs: number | null };

const DEFAULT_PROMPT = "Сделай современный ремонт. Используй предметы интерьера из референсов. Не меняй ракурс, пропорции и геометрию помещения.";
const ASPECTS = [
  ["RATIO_1_1", "1:1"], ["RATIO_16_9", "16:9"], ["RATIO_9_16", "9:16"], ["RATIO_4_3", "4:3"], ["RATIO_3_4", "3:4"],
] as const;

async function readJson(response: Response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Запрос не выполнен");
  return payload.data;
}

export function GenerationPanel({ projectId, sourceUrl, initialPrompt, initialAspectRatio = "RATIO_16_9" }: Props) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState(initialPrompt || DEFAULT_PROMPT);
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio);
  const [modelCode, setModelCode] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: async () => (await readJson(await fetch("/api/v1/models"))).models as Model[],
  });
  const usageQuery = useQuery({
    queryKey: ["usage", "today"],
    queryFn: async () => readJson(await fetch("/api/v1/usage/today")) as Promise<{ used: number; limit: number | null; remaining: number | null; plan: { name: string } }>,
  });
  const generationQuery = useQuery({
    queryKey: ["generation", generationId],
    enabled: Boolean(generationId),
    queryFn: async () => readJson(await fetch(`/api/v1/generations/${generationId}`)) as Promise<Generation>,
    refetchInterval: (query) => query.state.data && ["SUCCEEDED", "FAILED", "REJECTED", "CANCELLED"].includes(query.state.data.status) ? false : 1500,
  });
  const resultUrlQuery = useQuery({
    queryKey: ["result-url", generationQuery.data?.resultUserId],
    enabled: Boolean(generationQuery.data?.status === "SUCCEEDED" && generationQuery.data.resultUserId),
    queryFn: async () => readJson(await fetch(`/api/v1/media/${generationQuery.data!.resultUserId}/signed-url`)) as Promise<{ url: string }>,
  });

  useEffect(() => {
    if (generationQuery.data && ["SUCCEEDED", "FAILED", "REJECTED", "CANCELLED"].includes(generationQuery.data.status)) {
      void queryClient.invalidateQueries({ queryKey: ["usage", "today"] });
    }
  }, [generationQuery.data, queryClient]);

  const createMutation = useMutation({
    mutationFn: async () => readJson(await fetch("/api/v1/generations", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ projectId, prompt, modelCode: selectedModelCode, aspectRatio }),
    })) as Promise<{ id: string; status: string }>,
    onSuccess: (data) => setGenerationId(data.id),
  });
  const cancelMutation = useMutation({
    mutationFn: async () => readJson(await fetch(`/api/v1/generations/${generationId}/cancel`, { method: "POST" })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["generation", generationId] });
      void queryClient.invalidateQueries({ queryKey: ["usage", "today"] });
    },
  });

  const status = generationQuery.data?.status;
  const active = createMutation.isPending || status === "QUEUED" || status === "PROCESSING";
  const availableModels = modelsQuery.data ?? [];
  const selectedModelCode = modelCode || availableModels[0]?.code || "";

  return (
    <section className="mt-7 rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black tracking-[0.18em] text-accent uppercase">Шаг 3 из 3</p><h2 className="mt-2 text-2xl font-black italic">Инструкция и генерация</h2></div>
        {usageQuery.data && <span className="rounded-full bg-surface-elevated px-4 py-2 text-sm font-bold">Сегодня: {usageQuery.data.used} / {usageQuery.data.limit ?? "∞"}</span>}
      </div>

      <label className="mt-6 grid gap-2 text-sm font-bold">Техническое задание для AI
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} minLength={3} maxLength={4000} rows={6} className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 font-normal leading-6 outline-none focus:border-accent" />
        <span className="text-right text-xs font-normal text-muted">{prompt.length} / 4000</span>
      </label>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">Модель
          <select value={selectedModelCode} onChange={(event) => setModelCode(event.target.value)} disabled={modelsQuery.isPending || availableModels.length === 0} className="rounded-xl border border-border bg-surface px-4 py-3 font-normal disabled:opacity-50">
            {availableModels.map((model) => <option key={model.code} value={model.code}>{model.name}</option>)}
          </select>
        </label>
        <fieldset className="grid gap-2"><legend className="text-sm font-bold">Формат</legend><div className="flex flex-wrap gap-2">{ASPECTS.map(([value, label]) => <button key={value} type="button" onClick={() => setAspectRatio(value)} className={`rounded-lg px-3 py-3 text-sm ${aspectRatio === value ? "bg-accent font-bold text-accent-foreground" : "bg-surface text-muted"}`}>{label}</button>)}</div></fieldset>
      </div>

      {(createMutation.error || generationQuery.data?.errorMessage) && <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{createMutation.error?.message ?? generationQuery.data?.errorMessage}</p>}
      {active && <p className="mt-5 rounded-xl bg-surface-elevated p-4 text-sm text-muted">{status === "PROCESSING" ? "AI обрабатывает изображение…" : "Ставим генерацию в очередь…"}</p>}
      {status === "QUEUED" && <button type="button" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} className="mt-3 text-sm font-bold text-red-300">Отменить генерацию</button>}
      {resultUrlQuery.data?.url && (
        <div className="mt-5 grid gap-3">
          <BeforeAfter beforeUrl={sourceUrl} afterUrl={resultUrlQuery.data.url} />
          <a href={`/api/v1/generations/${generationId}/download`} className={buttonClassName("secondary", "rounded-xl text-center")}>Скачать результат</a>
        </div>
      )}

      <button type="button" onClick={() => createMutation.mutate()} disabled={active || !selectedModelCode || prompt.trim().length < 3 || usageQuery.data?.remaining === 0} className={buttonClassName("primary", "mt-6 w-full rounded-xl py-4 disabled:cursor-not-allowed disabled:opacity-45")}>
        {active ? "Генерируем…" : status === "SUCCEEDED" ? "Создать ещё вариант →" : "Визуализировать →"}
      </button>
    </section>
  );
}
