"use client";

import dynamic from "next/dynamic";
import { CircleHelp } from "lucide-react";
import { useMemo } from "react";
import type {
  Props as JoyrideProps,
  TooltipRenderProps,
} from "react-joyride";
import type { CanvasOnboardingStep } from "../model/canvas-onboarding";
import { CANVAS_ONBOARDING_STEP } from "../model/canvas-onboarding";

const Joyride = dynamic<JoyrideProps>(
  () => import("react-joyride").then((module) => module.Joyride),
  { ssr: false },
);

type CanvasOnboardingStepData = {
  onPrimary(): void;
  onSkip(): void;
};

function CanvasOnboardingTooltip({
  index,
  isLastStep,
  size,
  step,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) {
  const actions = step.data as CanvasOnboardingStepData;

  return (
    <div
      {...tooltipProps}
      className="w-[min(340px,calc(100vw-24px))] rounded-2xl border border-primary/30 bg-card p-5 text-foreground shadow-2xl"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          Возможности холста
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {index + 1} / {size}
        </span>
      </div>
      {step.title ? (
        <h2 className="mt-3 text-lg font-black">{step.title}</h2>
      ) : null}
      <div className="mt-2 text-sm leading-6 text-muted-foreground">
        {step.content}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          {...skipProps}
          type="button"
          onClick={actions.onSkip}
          className="min-h-10 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Пропустить
        </button>
        <button
          {...primaryProps}
          type="button"
          onClick={actions.onPrimary}
          className="min-h-10 rounded-lg bg-primary px-4 text-sm font-black text-primary-foreground hover:brightness-105"
        >
          {isLastStep ? "Готово" : "Следующее"}
        </button>
      </div>
    </div>
  );
}

const steps = [
  {
    target: "[data-onboarding='canvas']",
    placement: "center" as const,
    title: "Покажите идею прямо на изображении",
    content:
      "За минуту разберём главную механику Ruvie: разметка, референсы, стиль, генерация и точечная доработка результата.",
    blockTargetInteraction: true,
  },
  {
    target: "[data-onboarding='drawing-tools']",
    placement: "right" as const,
    title: "Нарисуйте, что нужно изменить",
    content:
      "Ручкой, маркером или прямоугольником можно показать модели точное место изменения на фотографии.",
  },
  {
    target: "[data-onboarding='references']",
    placement: "left" as const,
    title: "Добавьте визуальные референсы",
    content:
      "Загрузите мебель, материалы или примеры интерьера — модель будет учитывать их при создании результата.",
  },
  {
    target: "[data-onboarding='styles']",
    placement: "left" as const,
    title: "Выберите стиль",
    content:
      "Один стиль задаёт визуальное направление всему будущему интерьеру.",
  },
  {
    target: "[data-onboarding='generate']",
    placement: "left" as const,
    title: "Создайте первый вариант",
    content:
      "Когда всё готово, проверьте описание и нажмите кнопку генерации. Onboarding сам ничего не запускает.",
  },
  {
    target: "[data-onboarding='canvas']",
    placement: "center" as const,
    title: "Дорабатывайте, а не начинайте заново",
    content:
      "После получения результата выберите «Доработать»: можно снова рисовать и менять только нужную деталь.",
    blockTargetInteraction: true,
  },
];

export function CanvasOnboardingTrigger({
  active,
  onStart,
}: {
  active: boolean;
  onStart(): void;
}) {
  if (active) return null;

  return (
    <button
      type="button"
      onClick={onStart}
      className="absolute top-3 left-3 z-20 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold shadow-xl transition-colors hover:bg-secondary"
      aria-label="Показать обучение по холсту"
      title="Обучение по холсту"
    >
      <CircleHelp size={18} aria-hidden="true" />
      <span className="hidden sm:inline">Как работать</span>
    </button>
  );
}

export function CanvasOnboarding({
  active,
  step,
  targetReady,
  onAdvance,
  onFinish,
}: {
  active: boolean;
  step: CanvasOnboardingStep;
  targetReady: boolean;
  onAdvance(step: CanvasOnboardingStep): void;
  onFinish(): void;
}) {
  const controlledSteps = useMemo(
    () =>
      steps.map((item, index) => ({
        ...item,
        data: {
          onSkip: onFinish,
          onPrimary:
            index === CANVAS_ONBOARDING_STEP.refinement
              ? onFinish
              : () => onAdvance(index as CanvasOnboardingStep),
        } satisfies CanvasOnboardingStepData,
      })),
    [onAdvance, onFinish],
  );

  if (!active) return null;

  return (
    <Joyride
      run={active && targetReady}
      continuous
      stepIndex={step}
      steps={controlledSteps}
      portalElement="[data-onboarding='canvas']"
      tooltipComponent={CanvasOnboardingTooltip}
      scrollToFirstStep
      options={{
        buttons: ["primary", "skip"],
        skipBeacon: true,
        showProgress: true,
        overlayClickAction: false,
        dismissKeyAction: false,
        spotlightPadding: 8,
        primaryColor: "#afea4d",
        zIndex: 100,
      }}
    />
  );
}
