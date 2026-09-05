import "server-only";

import { serverEnv } from "@/server/shared/config/env";

export class GenerationEmergencyStopError extends Error {
  readonly code = "GENERATIONS_DISABLED";

  constructor() {
    super(
      "Генерации временно приостановлены. Попробуйте позже или обратитесь в поддержку.",
    );
    this.name = "GenerationEmergencyStopError";
  }
}

export function ensureGenerationsEnabled() {
  if (!serverEnv().GENERATIONS_ENABLED) {
    throw new GenerationEmergencyStopError();
  }
}
