"use client";

import {
  AlertCircle,
  Coins,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { ReferenceManager } from "./reference-manager";
import { StylePicker } from "./style-picker";
import { Button } from "@/shared/ui";
import { Textarea } from "@/shared/ui";
import type { WorkspaceReference } from "../model/workspace-types";
import {
  GENERATION_ASPECT_RATIO_LABELS,
  GENERATION_ASPECT_RATIOS,
  type GenerationAspectRatio,
  type GenerationAspectRatioSelection,
} from "../model/generation-aspect-ratio";
import {
  GENERATION_CREDIT_COST,
  GENERATION_REFUND_MESSAGE,
} from "@/shared/config";
import {
  type GenerationWallet,
  generationWalletPresentation,
} from "@/features/generate-design";

export type DesignInspectorProps = {
  projectId: string;
  initialReferences: WorkspaceReference[];
  prompt: string;
  onPromptChange(value: string): void;
  styles: Array<{ code: string; name: string; imageUrl: string }>;
  styleCode: string | undefined;
  onStyleChange(value: string | undefined): void;
  aspectRatio: GenerationAspectRatioSelection;
  sourceAspectRatio: GenerationAspectRatio;
  onAspectRatioChange(value: GenerationAspectRatioSelection): void;
  credits: GenerationWallet | null | undefined;
  dataLoading: boolean;
  dataError: string | null;
  generationPending: boolean;
  generationError: string | null;
  generationErrorCode: string | null;
  disabledReasons: string[];
  onGenerate(): void;
};

export function DesignInspector({
  projectId,
  initialReferences,
  prompt,
  onPromptChange,
  styles,
  styleCode,
  onStyleChange,
  aspectRatio,
  sourceAspectRatio,
  onAspectRatioChange,
  credits,
  dataLoading,
  dataError,
  generationPending,
  generationError,
  generationErrorCode,
  disabledReasons,
  onGenerate,
}: DesignInspectorProps) {
  const promptIsInvalid =
    prompt.length > 0 && (prompt.trim().length < 3 || prompt.length > 4000);
  const walletPresentation = generationWalletPresentation(
    credits,
    "root",
    generationErrorCode,
  );
  const generationCost = credits?.generationCost ?? GENERATION_CREDIT_COST;

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
      <div className="min-h-0 min-w-0 max-w-full flex-1 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4">
        <section aria-labelledby="inspector-references-title">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="inspector-references-title"
              className="text-xs font-semibold text-foreground"
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
              className="text-xs font-semibold text-foreground"
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
          <Textarea
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
            className="mt-2 min-h-32 resize-none bg-background"
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

        <fieldset>
          <legend className="text-xs font-semibold text-foreground">
            Формат
          </legend>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            <label
              className={`workspace-focus-proxy col-span-5 flex min-h-10 cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                aspectRatio === "SOURCE"
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border bg-secondary/55 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="aspect-ratio"
                value="SOURCE"
                checked={aspectRatio === "SOURCE"}
                onChange={() => onAspectRatioChange("SOURCE")}
                className="sr-only"
              />
              <span>Как в исходнике</span>
              <span className="font-mono text-[11px]">
                {GENERATION_ASPECT_RATIO_LABELS[sourceAspectRatio]}
              </span>
            </label>
            {GENERATION_ASPECT_RATIOS.map((ratio) => (
              <label
                key={ratio}
                className={`workspace-focus-proxy inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 font-mono text-[11px] font-semibold transition-colors ${
                  aspectRatio === ratio
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-border bg-secondary/55 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
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
                {GENERATION_ASPECT_RATIO_LABELS[ratio]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="shrink-0 border-t border-border bg-card px-4 py-4">
        <div className="flex items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-semibold text-foreground">
              {dataLoading
                ? "Проверяем баланс…"
                : walletPresentation.balanceText}
            </p>
            {walletPresentation.availableGenerationsText ? (
              <p className="mt-1 text-muted">
                {walletPresentation.availableGenerationsText}
              </p>
            ) : null}
          </div>
          <Link
            href="/app/credits"
            className="shrink-0 rounded-md border border-primary/25 px-2 py-1 font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Кредиты
          </Link>
        </div>

        {disabledReasons.length > 0 && (
          <div
            className="mt-3 flex gap-2 rounded-lg bg-secondary p-3 text-xs leading-5 text-muted-foreground"
            role="status"
          >
            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              {disabledReasons.join(" ")}
              {walletPresentation.balanceInsufficient &&
              walletPresentation.purchaseLink ? (
                <>
                  {" "}
                  <Link
                    href={walletPresentation.purchaseLink.href}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {walletPresentation.purchaseLink.label}
                  </Link>
                </>
              ) : null}
            </span>
          </div>
        )}
        {dataError && (
          <p className="mt-3 text-xs leading-5 text-red-300" role="alert">
            {dataError}
          </p>
        )}
        {generationError ? (
          <p className="mt-3 text-xs leading-5 text-red-300" role="alert">
            {generationError}
            {generationErrorCode === "INSUFFICIENT_CREDITS" &&
            walletPresentation.purchaseLink ? (
              <>
                {" "}
                <Link
                  href={walletPresentation.purchaseLink.href}
                  className="font-semibold underline underline-offset-2"
                >
                  {walletPresentation.purchaseLink.label}
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/7 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <Coins className="size-4 text-primary" aria-hidden="true" />
              Стоимость генерации
            </span>
            <span className="font-mono text-xs font-bold text-primary">
              {generationCost} кредита
            </span>
          </div>
          <p className="mt-2 flex gap-2 text-[11px] leading-5 text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 size-3.5 shrink-0 text-success"
              aria-hidden="true"
            />
            {GENERATION_REFUND_MESSAGE}
          </p>
        </div>

        <Button
          onClick={onGenerate}
          disabled={disabledReasons.length > 0}
          className="mt-3 w-full"
          size="lg"
        >
          {generationPending ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Sparkles size={18} aria-hidden="true" />
          )}
          {generationPending ? "Запускаем…" : walletPresentation.buttonLabel}
        </Button>
      </div>
    </div>
  );
}
