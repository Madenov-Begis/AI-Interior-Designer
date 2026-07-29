import { canDebit } from "../credits/policy.ts";

export type RequiredProvider = "FAKE" | "VERTEX_AI";

export function hasGenerationCredits(balance: number, cost: number) {
  return canDebit(balance, cost);
}

export function reservationHttpStatus(code: string, fallback: number) {
  return code === "INSUFFICIENT_CREDITS" ? 402 : fallback;
}

export function resolveRequiredProvider(
  aiProvider: string | undefined,
): RequiredProvider {
  if (aiProvider === "fake") return "FAKE";
  if (aiProvider === "vertex") return "VERTEX_AI";
  throw new Error("AI_PROVIDER_NOT_SUPPORTED");
}
