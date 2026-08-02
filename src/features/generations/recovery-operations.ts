export type ExpiredGenerationReservation = {
  generationId: string | null;
};

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
  let recovered = 0;
  for (const event of expired) {
    if (!event.generationId) continue;
    if (await dependencies.failGeneration(event.generationId)) recovered += 1;
  }
  return recovered;
}
