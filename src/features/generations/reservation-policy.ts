export type RequiredProvider = "FAKE" | "VERTEX_AI";

export function resolveRequiredProvider(
  aiProvider: string | undefined,
): RequiredProvider {
  if (aiProvider === "fake") return "FAKE";
  if (aiProvider === "vertex") return "VERTEX_AI";
  throw new Error("AI_PROVIDER_NOT_SUPPORTED");
}
