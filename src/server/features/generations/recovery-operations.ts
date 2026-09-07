export type ExpiredGenerationReservation = {
  generationId: string | null;
};

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
