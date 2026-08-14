import { apiData } from "@/shared/api";

export const CANVAS_ONBOARDING_VERSION = 1;

export type CanvasOnboardingPayload = {
  onboarding: {
    canvasOnboardingVersion: number;
    canvasOnboardingCompletedAt: string | null;
  };
};

export function readCanvasOnboarding() {
  return apiData<CanvasOnboardingPayload>({
    url: "/profile/canvas-onboarding",
    method: "GET",
  });
}

export function completeCanvasOnboarding() {
  return apiData<CanvasOnboardingPayload>({
    url: "/profile/canvas-onboarding",
    method: "PATCH",
    data: { version: CANVAS_ONBOARDING_VERSION },
  });
}
