"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  CANVAS_ONBOARDING_VERSION,
  completeCanvasOnboarding,
  readCanvasOnboarding,
} from "../api/canvas-onboarding";
import {
  advanceCanvasOnboarding,
  CANVAS_ONBOARDING_STEP,
  type CanvasOnboardingStep,
} from "./canvas-onboarding";

export function useCanvasOnboarding() {
  const status = useQuery({
    queryKey: ["profile", "canvas-onboarding"],
    queryFn: readCanvasOnboarding,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const completion = useMutation({ mutationFn: completeCanvasOnboarding });
  const [step, setStep] = useState<CanvasOnboardingStep>(
    CANVAS_ONBOARDING_STEP.welcome,
  );
  const [closed, setClosed] = useState(false);
  const [manualActive, setManualActive] = useState(false);
  const automaticActive = Boolean(
    !closed &&
      status.data &&
      status.data.onboarding.canvasOnboardingVersion <
        CANVAS_ONBOARDING_VERSION,
  );
  const active = automaticActive || manualActive;

  const advance = useCallback((expected: CanvasOnboardingStep) => {
    setStep((current) => advanceCanvasOnboarding(current, expected));
  }, []);

  const finish = useCallback(() => {
    setClosed(true);
    setManualActive(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const onboardingWasNotCompleted =
      status.data?.onboarding.canvasOnboardingVersion !== undefined &&
      status.data.onboarding.canvasOnboardingVersion <
        CANVAS_ONBOARDING_VERSION;
    if (
      onboardingWasNotCompleted &&
      !completion.isPending &&
      !completion.isSuccess
    ) {
      completion.mutate();
    }
  }, [completion, status.data]);

  const replay = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setStep(CANVAS_ONBOARDING_STEP.welcome);
    setManualActive(true);
  }, []);

  return {
    active,
    mode: manualActive ? ("manual" as const) : ("automatic" as const),
    step,
    advance,
    finish,
    replay,
  };
}
