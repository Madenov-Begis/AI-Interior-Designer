export type ExpiredGenerationReservation = {
  generationId: string | null;
};

export type RecoverableWorkerGeneration = {
  status: string;
  jobId: string | null;
};

export async function recoverInterruptedDevelopmentGenerationWithDependencies(
  input: {
    nodeEnv: string | undefined;
    userId: string;
    generationId: string;
    currentWorkerId: string;
  },
  dependencies: {
    findGeneration(
      userId: string,
      generationId: string,
    ): Promise<RecoverableWorkerGeneration | null>;
    failGeneration(generationId: string): Promise<boolean>;
  },
) {
  if (input.nodeEnv !== "development") return false;
  const generation = await dependencies.findGeneration(
    input.userId,
    input.generationId,
  );
  if (
    generation?.status !== "PROCESSING" ||
    !generation.jobId ||
    generation.jobId.startsWith(`${input.currentWorkerId}:`)
  ) {
    return false;
  }
  return dependencies.failGeneration(input.generationId);
}

export async function recoverExpiredReservationBatch(
  expired: ExpiredGenerationReservation[],
  failGeneration: (generationId: string) => Promise<boolean>,
) {
  let recovered = 0;
  const failedIds: string[] = [];
  for (const generationId of new Set(
    expired.flatMap((item) => (item.generationId ? [item.generationId] : [])),
  )) {
    try {
      if (await failGeneration(generationId)) recovered += 1;
    } catch {
      failedIds.push(generationId);
    }
  }
  return { recovered, failedIds };
}

export async function recoverExpiredReservationsWithDependencies(
  userId: string,
  now: Date,
  dependencies: {
    findExpired: (
      userId: string,
      now: Date,
    ) => Promise<ExpiredGenerationReservation[]>;
    failGeneration: (generationId: string) => Promise<boolean>;
  },
) {
  const expired = await dependencies.findExpired(userId, now);
  const result = await recoverExpiredReservationBatch(
    expired,
    dependencies.failGeneration,
  );
  if (result.failedIds.length)
    throw new Error("GENERATION_RECOVERY_INCOMPLETE");
  return result.recovered;
}
