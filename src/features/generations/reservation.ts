import "server-only";

import { randomUUID } from "node:crypto";
import {
  reserveRefinementWithDependencies,
  reserveRootGenerationWithDependencies,
  type RefinementReservationInput,
  type RootGenerationReservationInput,
} from "@/features/generations/operations";
import { buildFinalPrompt } from "@/features/generations/prompt";
import { getDb } from "@/lib/db";

export {
  GenerationReservationError,
  usageDateInTimezone,
} from "@/features/generations/operations";

function reservationDependencies() {
  return {
    db: getDb(),
    aiProvider: process.env.AI_PROVIDER,
    buildFinalPrompt,
    randomUUID,
    now: () => new Date(),
  };
}

export function reserveRootGeneration(input: RootGenerationReservationInput) {
  return reserveRootGenerationWithDependencies(
    reservationDependencies(),
    input,
  );
}

export function reserveRefinement(input: RefinementReservationInput) {
  return reserveRefinementWithDependencies(reservationDependencies(), input);
}
