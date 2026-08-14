export const CANVAS_ONBOARDING_STEP = {
  welcome: 0,
  drawing: 1,
  references: 2,
  styles: 3,
  generation: 4,
  refinement: 5,
} as const;

export type CanvasOnboardingStep =
  (typeof CANVAS_ONBOARDING_STEP)[keyof typeof CANVAS_ONBOARDING_STEP];

export function advanceCanvasOnboarding(
  current: CanvasOnboardingStep,
  expected: CanvasOnboardingStep,
): CanvasOnboardingStep {
  if (current !== expected || current >= CANVAS_ONBOARDING_STEP.refinement) {
    return current;
  }
  return (current + 1) as CanvasOnboardingStep;
}
