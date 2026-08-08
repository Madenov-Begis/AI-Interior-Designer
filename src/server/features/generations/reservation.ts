import "server-only";

import { randomUUID } from "node:crypto";
import {
  reserveRefinementWithDependencies,
  reserveRootGenerationWithDependencies,
  type RefinementReservationInput,
  type RootGenerationReservationInput,
} from "@/server/features/generations/operations";
import {
  buildFinalPrompt,
  buildRefinementPrompt,
} from "@/server/features/generations/prompt";
import { getDb } from "@/server/shared/db/prisma";

export {
  GenerationReservationError,
  usageDateInTimezone,
} from "@/server/features/generations/operations";

function reservationDependencies() {
  return {
    db: getDb(),
    aiProvider: process.env.AI_PROVIDER,
    buildFinalPrompt,
    buildRefinementPrompt,
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
