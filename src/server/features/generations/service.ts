import "server-only";

import {
  cancelOwnedGenerationWithDatabase,
  failGenerationWithDatabase,
} from "@/server/features/generations/operations";
import { getDb } from "@/server/shared/db/prisma";

export async function getGenerationUsage(userId: string) {
  const profile = await getDb().profile.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!profile) return null;
  const used = await getDb().usageEvent.count({
    where: { userId, status: "CONSUMED" },
  });
  return { used };
}

export async function getOwnedGeneration(userId: string, id: string) {
  const db = getDb();
  const readGeneration = async () => {
    const generation = await db.generation.findFirst({
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
        resultOriginalId: true,
        errorCode: true,
        errorMessage: true,
        createdAt: true,
        queuedAt: true,
        startedAt: true,
        completedAt: true,
        durationMs: true,
        usageEvent: { select: { status: true, expiresAt: true } },
        resultOriginal: {
          select: {
            bucket: true,
            path: true,
            width: true,
            height: true,
          },
        },
        references: {
          orderBy: { position: "asc" },
          select: { fileId: true, position: true },
        },
      },
    });
    return generation
      ? {
          ...generation,
          resultUserId: generation.resultOriginalId,
          resultUser: generation.resultOriginal,
        }
      : null;
  };
  const generation = await readGeneration();
  if (
    generation &&
    (generation.status === "QUEUED" || generation.status === "PROCESSING") &&
    generation.usageEvent?.status === "RESERVED" &&
    generation.usageEvent.expiresAt &&
    generation.usageEvent.expiresAt <= new Date()
  ) {
    await failGenerationWithDatabase(db, {
      generationId: generation.id,
      code: "GENERATION_EXPIRED",
      message: "Генерация не завершилась вовремя. Кредиты возвращены.",
    });
    return readGeneration();
  }
  return generation;
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
  const total = await db.generation.count({ where });
  const rows = await db.generation.findMany({
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
      resultOriginalId: true,
      errorCode: true,
      errorMessage: true,
      createdAt: true,
      queuedAt: true,
      completedAt: true,
      durationMs: true,
      project: { select: { name: true, sourcePreviewId: true } },
      resultOriginal: {
        select: { bucket: true, path: true, width: true, height: true },
      },
      references: {
        orderBy: { position: "asc" },
        select: { fileId: true, position: true },
      },
      _count: { select: { references: true } },
    },
  });
  const hasMore = rows.length > input.limit;
  const pageRows = hasMore ? rows.slice(0, input.limit) : rows;
  const items = pageRows.map((generation) => ({
    ...generation,
    resultUserId: generation.resultOriginalId,
    resultUser: generation.resultOriginal,
  }));
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
