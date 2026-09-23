"use client";

import { AlertCircle, ImagePlus } from "lucide-react";
import Link from "next/link";
import { ReferenceManager } from "./reference-manager";
import { StylePicker } from "./style-picker";
import {
  LoadingButton,
  Select as RoomSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/shared/ui";
import type { RoomTypeOption } from "@/shared/api";
import type { WorkspaceReference } from "../model/workspace-types";
import {
  GENERATION_ASPECT_RATIO_LABELS,
  GENERATION_ASPECT_RATIOS,
  type GenerationAspectRatio,
  type GenerationAspectRatioSelection,
} from "../model/generation-aspect-ratio";
import {
  type GenerationWallet,
  generationWalletPresentation,
} from "@/features/generate-design";
import { useAppText } from "@/shared/providers";

export type DesignInspectorProps = {
  projectId: string;
  initialReferences: WorkspaceReference[];
  prompt: string;
  onPromptChange(value: string): void;
  rooms: RoomTypeOption[];
  roomTypeId: string | undefined;
  onRoomTypeChange(value: string): void;
  selectPortalContainer?: HTMLElement | null;
  styles: Array<{ code: string; name: string; imageUrl: string }>;
  styleCode: string | undefined;
  onStyleChange(value: string | undefined): void;
  aspectRatio: GenerationAspectRatioSelection;
  sourceAspectRatio: GenerationAspectRatio;
  onAspectRatioChange(value: GenerationAspectRatioSelection): void;
  credits: GenerationWallet | null | undefined;
  dataLoading: boolean;
  dataError: string | null;
  onDataRetry(): void;
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
  rooms,
  roomTypeId,
  onRoomTypeChange,
  selectPortalContainer,
  styles,
  styleCode,
  onStyleChange,
  aspectRatio,
  sourceAspectRatio,
  onAspectRatioChange,
  credits,
  dataLoading,
  dataError,
  onDataRetry,
  generationPending,
  generationError,
  generationErrorCode,
  disabledReasons,
  onGenerate,
}: DesignInspectorProps) {
  const t = useAppText();
  const walletPresentation = generationWalletPresentation(
    credits,
    "root",
    generationErrorCode,
  );
  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
      <div className="min-h-0 min-w-0 max-w-full flex-1 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4">
        <section
          aria-labelledby="inspector-references-title"
          data-onboarding="references"
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              id="inspector-references-title"
              className="text-xs font-semibold text-foreground"
            >
              {t("Референсы")}
            </h2>
          </div>
          <ReferenceManager
            projectId={projectId}
            initialReferences={initialReferences}
            variant="compact"
          />
        </section>

        <section
          aria-labelledby="inspector-prompt-title"
          className="border-y border-border py-4"
        >
          <label
            id="inspector-prompt-title"
            htmlFor="generation-prompt"
            className="block text-sm font-medium text-foreground"
          >
            {t("Опишите желаемый результат")} ({t("Необязательно")})
          </label>
          <Textarea
            id="generation-prompt"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={5}
            placeholder={t("Например: замените диван на светлый, добавьте тёплое освещение и сохраните расположение окон")}
            className="mt-3 min-h-32 resize-none rounded-md border-border bg-background text-sm shadow-none focus-visible:border-muted-foreground focus-visible:ring-0"
          />
        </section>

        <section aria-labelledby="inspector-room-title">
          <label
            id="inspector-room-title"
            className="block text-xs font-semibold text-foreground"
          >
            {t("Комната")}
          </label>
          <RoomSelect
            value={roomTypeId ?? ""}
            onValueChange={onRoomTypeChange}
            disabled={dataLoading || Boolean(dataError) || rooms.length === 0}
          >
            <SelectTrigger
              className="mt-3"
              aria-labelledby="inspector-room-title"
            >
              <SelectValue
                placeholder={
                  dataLoading ? t("Загружаем комнаты…") : t("Выберите комнату")
                }
              />
            </SelectTrigger>
            <SelectContent portalContainer={selectPortalContainer}>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {t(room.name)}
                </SelectItem>
            ))}
          </SelectContent>
          </RoomSelect>
          {dataError ? (
            <div
              className="mt-2 flex items-center justify-between gap-3 text-xs"
              role="alert"
            >
              <span className="text-red-300">{t(dataError)}</span>
              <button
                type="button"
                onClick={onDataRetry}
                className="min-h-10 shrink-0 cursor-pointer rounded-lg px-3 font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {t("Повторить")}
              </button>
            </div>
          ) : !dataLoading && rooms.length === 0 ? (
            <p className="mt-2 text-xs leading-5 text-red-300" role="alert">
              {t("Доступных комнат пока нет. Обратитесь к администратору.")}
            </p>
          ) : null}
        </section>

        <div data-onboarding="styles">
          <StylePicker
            styles={styles}
            value={styleCode}
            onChange={onStyleChange}
          />
        </div>

        <fieldset>
          <legend className="text-xs font-semibold text-foreground">
            {t("Формат")}
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
              <span>{t("Как в исходнике")}</span>
              <span className="font-mono text-xs">
                {GENERATION_ASPECT_RATIO_LABELS[sourceAspectRatio]}
              </span>
            </label>
            {GENERATION_ASPECT_RATIOS.map((ratio) => (
              <label
                key={ratio}
                className={`workspace-focus-proxy inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 font-mono text-xs font-semibold transition-colors ${
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

      <div className="shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <p className="font-semibold text-foreground">
            {dataLoading
              ? t("Проверяем баланс…")
              : credits
                ? t("Баланс: {balance} кредитов", { balance: credits.balance })
                : t("Баланс недоступен")}
          </p>
          <Link
            href="/app/credits"
            className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-primary/25 px-3 font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {t("Пополнить")}
          </Link>
        </div>

        {disabledReasons.length > 0 && (
          <div
            className="mt-2 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground"
            role="status"
          >
            <AlertCircle
              size={16}
              className="shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              {disabledReasons.map((reason) => t(reason)).join(" ")}
              {walletPresentation.balanceInsufficient &&
              walletPresentation.purchaseLink ? (
                <>
                  {" "}
                  <Link
                    href={walletPresentation.purchaseLink.href}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {t(walletPresentation.purchaseLink.label)}
                  </Link>
                </>
              ) : null}
            </span>
          </div>
        )}
        {generationError ? (
          <p className="mt-3 text-xs leading-5 text-red-300" role="alert">
            {t(generationError)}
            {generationErrorCode === "INSUFFICIENT_CREDITS" &&
            walletPresentation.purchaseLink ? (
              <>
                {" "}
                <Link
                  href={walletPresentation.purchaseLink.href}
                  className="font-semibold underline underline-offset-2"
                >
                  {t(walletPresentation.purchaseLink.label)}
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        <div data-onboarding="generate">
          <LoadingButton
            onClick={onGenerate}
            disabled={disabledReasons.length > 0}
            pending={generationPending}
            pendingText={t("Запускаем…")}
            className="mt-2 w-full"
            size="lg"
          >
            <ImagePlus size={18} aria-hidden="true" />
            {t("Создать дизайн · {cost} кредита", {
              cost: credits?.generationCost ?? 4,
            })}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
