import { canDebit } from "../credits/policy.ts";

export type RequiredProvider = "FAKE" | "VERTEX_AI";

export function hasGenerationCredits(balance: number, cost: number) {
  return canDebit(balance, cost);
}

const ROOT_RESERVATION_STATUS: Record<string, number> = {
  USER_BLOCKED: 403,
  PROFILE_NOT_FOUND: 404,
  PROJECT_NOT_READY: 400,
  ROOM_NOT_AVAILABLE: 409,
  MODEL_NOT_FOUND: 404,
  MODEL_NOT_ALLOWED: 403,
  GENERATION_ALREADY_RUNNING: 409,
  INSUFFICIENT_CREDITS: 402,
};

const REFINEMENT_RESERVATION_STATUS: Record<string, number> = {
  GENERATION_NOT_FOUND: 404,
  GENERATION_NOT_REFINABLE: 409,
  MODEL_NOT_ALLOWED: 403,
  REFERENCE_NOT_FOUND: 400,
  REFERENCE_LIMIT_EXCEEDED: 400,
  VISUAL_PROMPT_NOT_FOUND: 400,
  GENERATION_ALREADY_RUNNING: 409,
  INSUFFICIENT_CREDITS: 402,
};

export function rootReservationHttpStatus(code: string) {
  return ROOT_RESERVATION_STATUS[code] ?? 400;
}

export function refinementReservationHttpStatus(code: string) {
  return REFINEMENT_RESERVATION_STATUS[code] ?? 400;
}

export function retryReservationHttpStatus(code: string) {
  if (code === "INSUFFICIENT_CREDITS") return 402;
  return 409;
}

export function resolveRequiredProvider(
  aiProvider: string | undefined,
): RequiredProvider {
  if (aiProvider === "fake") return "FAKE";
  if (aiProvider === "vertex") return "VERTEX_AI";
  throw new Error("AI_PROVIDER_NOT_SUPPORTED");
}
