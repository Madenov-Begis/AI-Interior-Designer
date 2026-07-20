import "server-only";

import { ensureSystemDefaults } from "@/features/plans/defaults";
import { usageDateInTimezone } from "@/features/generations/reservation";
import { getDb } from "@/lib/db";

export async function listAvailableModels(userId: string) {
  const defaults = await ensureSystemDefaults();
  const profile = await getDb().profile.findUnique({ where: { id: userId }, include: { plan: true, subscriptions: { where: { status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, orderBy: { startsAt: "desc" }, take: 1, include: { plan: true } } } });
  const plan = profile?.subscriptions[0]?.plan ?? profile?.plan ?? defaults.freePlan;
  return getDb().aiModel.findMany({
    where: { active: true, plans: { some: { planId: plan.id } } },
    orderBy: { priority: "desc" },
    select: { code: true, name: true, description: true, preview: true, supportsVisualPrompt: true, supportedAspectRatios: true },
  });
}

export async function getTodayUsage(userId: string) {
  const defaults = await ensureSystemDefaults();
  const profile = await getDb().profile.findUnique({ where: { id: userId }, include: { plan: true, subscriptions: { where: { status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, orderBy: { startsAt: "desc" }, take: 1, include: { plan: true } } } });
  if (!profile) return null;
  const plan = profile.subscriptions[0]?.plan ?? profile.plan ?? defaults.freePlan;
  const limit = profile.dailyLimitOverride ?? plan.dailyGenerationLimit;
  const usageDate = usageDateInTimezone(profile.timezone);
  const used = await getDb().usageEvent.count({ where: { userId, usageDate, status: { in: ["RESERVED", "CONSUMED"] } } });
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used), timezone: profile.timezone, plan: { code: plan.code, name: plan.name, watermarkRequired: plan.watermarkRequired } };
}

export function getOwnedGeneration(userId: string, id: string) {
  return getDb().generation.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true, projectId: true, status: true, prompt: true, finalPrompt: true, aspectRatio: true, visualPromptUsed: true, resultUserId: true, errorCode: true, errorMessage: true, queuedAt: true, startedAt: true, completedAt: true, durationMs: true, model: { select: { code: true, name: true } } },
  });
}
