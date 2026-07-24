"use client";

import {
  AlertCircle,
  ChevronDown,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { ReferenceManager } from "@/components/design/reference-manager";
import { StylePicker } from "@/components/design/style-picker";
import { buttonClassName } from "@/components/ui/button";
import type { WorkspaceReference } from "@/components/design/workspace-types";

type Model = {
  code: string;
  name: string;
  supportedAspectRatios: string[];
};

type Usage = {
  used: number;
  limit: number | null;
  remaining: number | null;
  plan: {
    code: string;
    name: string;
    watermarkRequired: boolean;
  };
};

export type DesignInspectorProps = {
  projectId: string;
  initialReferences: WorkspaceReference[];
  prompt: string;
  onPromptChange(value: string): void;
  styles: Array<{ code: string; name: string; imageUrl: string }>;
  styleCode: string | undefined;
  onStyleChange(value: string | undefined): void;
  models: Model[];
  modelCode: string;
  onModelChange(value: string): void;
  aspectRatio: string;
  onAspectRatioChange(value: string): void;
  usage: Usage | null | undefined;
  dataLoading: boolean;
  dataError: string | null;
  generationPending: boolean;
  generationError: string | null;
  disabledReasons: string[];
  onGenerate(): void;
};

const ASPECT_RATIO_LABELS: Record<string, string> = {
  RATIO_1_1: "1:1",
  RATIO_16_9: "16:9",
  RATIO_9_16: "9:16",
  RATIO_4_3: "4:3",
  RATIO_3_4: "3:4",
};

export function DesignInspector({
  projectId,
  initialReferences,
  prompt,
  onPromptChange,
  styles,
  styleCode,
  onStyleChange,
  models,
  modelCode,
  onModelChange,
  aspectRatio,
  onAspectRatioChange,
  usage,
  dataLoading,
  dataError,
  generationPending,
  generationError,
  disabledReasons,
  onGenerate,
}: DesignInspectorProps) {
  const selectedModel = models.find((model) => model.code === modelCode);
  const supportedAspectRatios = selectedModel?.supportedAspectRatios ?? [];
  const promptIsInvalid =
    prompt.length > 0 && (prompt.trim().length < 3 || prompt.length > 4000);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
        <section aria-labelledby="inspector-references-title">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="inspector-references-title"
              className="text-sm font-black text-foreground"
            >
              Референсы
            </h2>
          </div>
          <ReferenceManager
            projectId={projectId}
            initialReferences={initialReferences}
            variant="compact"
          />
        </section>

        <section aria-labelledby="inspector-prompt-title">
          <div className="flex items-center justify-between gap-3">
            <label
              id="inspector-prompt-title"
              htmlFor="generation-prompt"
              className="text-sm font-black text-foreground"
            >
              Что изменить?
            </label>
            <span
              className={`text-xs tabular-nums ${
                prompt.length > 4000 ? "text-red-300" : "text-muted"
              }`}
            >
              {prompt.length} / 4000
            </span>
          </div>
          <textarea
            id="generation-prompt"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={5}
            minLength={3}
            maxLength={4000}
            aria-invalid={promptIsInvalid}
            aria-describedby={
              promptIsInvalid ? "generation-prompt-error" : undefined
            }
            placeholder="Например: замените диван, добавьте тёплое освещение и сохраните расположение окон"
            className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-muted/70 focus:border-accent"
          />
          {promptIsInvalid && (
            <p
              id="generation-prompt-error"
              className="mt-2 text-xs leading-5 text-red-300"
            >
              Инструкция должна содержать от 3 до 4000 символов.
            </p>
          )}
        </section>

        <StylePicker
          styles={styles}
          value={styleCode}
          onChange={onStyleChange}
        />

        <details className="group rounded-xl border border-border bg-background">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-black marker:content-none">
            Модель и формат
            <ChevronDown
              size={18}
              className="text-muted transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="space-y-5 border-t border-border px-4 py-4">
            <label className="grid gap-2 text-xs font-bold text-muted">
              Модель
              <select
                value={modelCode}
                onChange={(event) => onModelChange(event.target.value)}
                disabled={!models.length}
                className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm font-bold text-foreground outline-none focus:border-accent disabled:opacity-50"
              >
                {!models.length && <option value="">Нет доступных моделей</option>}
                {models.map((model) => (
                  <option key={model.code} value={model.code}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className="text-xs font-bold text-muted">Формат</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {supportedAspectRatios.map((ratio) => (
                  <label
                    key={ratio}
                    className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-xs font-black transition-colors ${
                      aspectRatio === ratio
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-surface text-foreground hover:border-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="aspect-ratio"
                      value={ratio}
                      checked={aspectRatio === ratio}
                      onChange={() => onAspectRatioChange(ratio)}
                      className="sr-only"
                    />
                    {ASPECT_RATIO_LABELS[ratio] ?? ratio}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </details>
      </div>

      <div className="shrink-0 border-t border-border bg-surface px-5 py-4">
        <div className="flex items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-black text-foreground">
              {usage ? usage.plan.name : "Дневной лимит"}
            </p>
            <p className="mt-1 text-muted">
              {dataLoading
                ? "Проверяем доступ…"
                : usage?.limit === null
                  ? `Использовано сегодня: ${usage.used}`
                  : usage
                    ? `Осталось ${usage.remaining} из ${usage.limit}`
                    : "Лимит недоступен"}
            </p>
          </div>
          {usage?.plan.watermarkRequired && (
            <span className="rounded-full border border-border px-2 py-1 text-muted">
              С водяным знаком
            </span>
          )}
        </div>

        {disabledReasons.length > 0 && (
          <div
            className="mt-3 flex gap-2 rounded-lg bg-surface-elevated p-3 text-xs leading-5 text-muted"
            role="status"
          >
            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0 text-accent"
              aria-hidden="true"
            />
            <span>{disabledReasons.join(" ")}</span>
          </div>
        )}
        {dataError && (
          <p className="mt-3 text-xs leading-5 text-red-300" role="alert">
            {dataError}
          </p>
        )}
        {generationError && (
          <p className="mt-3 text-xs leading-5 text-red-300" role="alert">
            {generationError}
          </p>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={disabledReasons.length > 0}
          className={buttonClassName(
            "primary",
            "mt-4 w-full rounded-xl disabled:cursor-not-allowed disabled:opacity-45",
          )}
        >
          {generationPending ? (
            <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles size={18} aria-hidden="true" />
          )}
          {generationPending ? "Запускаем…" : "Создать дизайн"}
        </button>
      </div>
    </div>
  );
}
