import "server-only";

import { getRequiredPlan } from "@/features/plans/defaults";
import { resolveEffectivePlan } from "@/features/plans/resolve-plan";
import { cancelOwnedGenerationWithDatabase } from "@/features/generations/operations";
import { usageDateInTimezone } from "@/features/generations/reservation";
import { getDb } from "@/lib/db";

export async function getTodayUsage(userId: string) {
  const profile = await getDb().profile.findUnique({
    where: { id: userId },
    include: {
      plan: true,
      subscriptions: {
        where: {
          status: "ACTIVE",
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        orderBy: { startsAt: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
  });
  if (!profile) return null;
  const plan = await resolveEffectivePlan(
    profile.subscriptions[0]?.plan,
    profile.plan,
    () => getRequiredPlan("FREE"),
  );
  const limit = profile.dailyLimitOverride ?? plan.dailyGenerationLimit;
  const usageDate = usageDateInTimezone(profile.timezone);
  const used = await getDb().usageEvent.count({
    where: { userId, usageDate, status: { in: ["RESERVED", "CONSUMED"] } },
  });
  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    timezone: profile.timezone,
    plan: {
      code: plan.code,
      name: plan.name,
      watermarkRequired: plan.watermarkRequired,
    },
  };
}

export function getOwnedGeneration(userId: string, id: string) {
  return getDb().generation.findFirst({
    where: { id, userId, deletedAt: null },
    select: {
      id: true,
      projectId: true,
      parentGenerationId: true,
      status: true,
      prompt: true,
      finalPrompt: true,
      aspectRatio: true,
      visualPromptUsed: true,
      resultUserId: true,
      errorCode: true,
      errorMessage: true,
      queuedAt: true,
      startedAt: true,
      completedAt: true,
      durationMs: true,
      resultUser: { select: { width: true, height: true } },
      references: {
        orderBy: { position: "asc" },
        select: { fileId: true, position: true },
      },
    },
  });
}

export async function listOwnedGenerations(
  userId: string,
  input: {
    limit: number;
    cursor?: string;
    status?:
      | "QUEUED"
      | "PROCESSING"
      | "SUCCEEDED"
      | "FAILED"
      | "CANCELLED"
      | "REJECTED";
    projectId?: string;
  },
) {
  const db = getDb();
  const where = {
    userId,
    deletedAt: null,
    status: input.status,
    projectId: input.projectId,
  };
  const [total, rows] = await db.$transaction([
    db.generation.count({ where }),
    db.generation.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        projectId: true,
        parentGenerationId: true,
        status: true,
        prompt: true,
        aspectRatio: true,
        visualPromptUsed: true,
        resultUserId: true,
        errorCode: true,
        errorMessage: true,
        createdAt: true,
        queuedAt: true,
        completedAt: true,
        durationMs: true,
        project: { select: { name: true, sourcePreviewId: true } },
        resultUser: {
          select: { bucket: true, path: true, width: true, height: true },
        },
        references: {
          orderBy: { position: "asc" },
          select: { fileId: true, position: true },
        },
        _count: { select: { references: true } },
      },
    }),
  ]);
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return {
    items,
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    total,
  };
}

export async function cancelOwnedGeneration(userId: string, id: string) {
  return cancelOwnedGenerationWithDatabase(getDb(), userId, id);
}
export async function cancelGenerationAsAdmin(id: string) {
  const generation = await getDb().generation.findFirst({
    where: { id, deletedAt: null },
    select: { userId: true },
  });
  return generation
    ? cancelOwnedGenerationWithDatabase(getDb(), generation.userId, id)
    : false;
}
export async function softDeleteOwnedGeneration(userId: string, id: string) {
  const updated = await getDb().generation.updateMany({
    where: {
      id,
      userId,
      status: { notIn: ["QUEUED", "PROCESSING"] },
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });
  return updated.count > 0;
}
