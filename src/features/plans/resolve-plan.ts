export async function resolveEffectivePlan<T>(
  subscriptionPlan: T | null | undefined,
  profilePlan: T | null | undefined,
  loadDefaultPlan: () => Promise<T>,
): Promise<T> {
  return subscriptionPlan ?? profilePlan ?? loadDefaultPlan();
}
