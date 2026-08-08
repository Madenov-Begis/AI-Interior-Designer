import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getOrCreateEntryProjectWithDatabase } from "@/server/features/projects/entry-operations";
import { DEFAULT_PROJECT_NAME } from "@/server/features/projects/naming";
import { getDb } from "@/server/shared/db/prisma";

const projectSummarySelect = {
  id: true,
  name: true,
  status: true,
  aspectRatio: true,
  createdAt: true,
  updatedAt: true,
  sourcePreview: {
    select: {
      id: true,
      width: true,
      height: true,
      bucket: true,
      path: true,
    },
  },
  generations: {
    where: { status: "SUCCEEDED", resultOriginalId: { not: null } },
    orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    take: 1,
    select: {
      resultOriginal: {
        select: {
          bucket: true,
          path: true,
          width: true,
          height: true,
        },
      },
    },
  },
  _count: {
    select: {
      generations: {
        where: { status: "SUCCEEDED", resultOriginalId: { not: null } },
      },
    },
  },
} satisfies Prisma.ProjectSelect;

export function createProject(userId: string, name: string) {
  return getDb().project.create({
    data: { userId, name },
    select: projectSummarySelect,
  });
}

export async function getOrCreateEntryProject(userId: string) {
  const db = getDb();
  return getOrCreateEntryProjectWithDatabase(
    {
      transaction: (callback) =>
        db.$transaction((tx) =>
          callback({
            lockUserEntry: async (lockedUserId) => {
              await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`project-entry:${lockedUserId}`}, 0))`;
            },
            findEmptyDraft: (entryUserId) =>
              tx.project.findFirst({
                where: {
                  userId: entryUserId,
                  status: "DRAFT",
                  deletedAt: null,
                  sourceImageId: null,
                  sourcePreviewId: null,
                },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                select: { id: true },
              }),
            createEmptyDraft: (entryUserId) =>
              tx.project.create({
                data: { userId: entryUserId, name: DEFAULT_PROJECT_NAME },
                select: { id: true },
              }),
          }),
        ),
    },
    userId,
  );
}

export async function listProjects(
  userId: string,
  limit: number,
  cursor?: string,
  page = 1,
  search?: string,
) {
  const db = getDb();
  const normalizedSearch = search?.trim();
  const where: Prisma.ProjectWhereInput = {
    userId,
    deletedAt: null,
    generations: {
      some: { status: "SUCCEEDED", resultOriginalId: { not: null } },
    },
    ...(normalizedSearch
      ? { name: { contains: normalizedSearch, mode: "insensitive" } }
      : {}),
  };
  const [rows, total] = await db.$transaction([
    db.project.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor
        ? { cursor: { id: cursor }, skip: 1 }
        : { skip: (page - 1) * limit }),
      select: projectSummarySelect,
    }),
    db.project.count({ where }),
  ]);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    page,
    pageCount: Math.ceil(total / limit),
    total,
  };
}

export function findOwnedProject(userId: string, id: string) {
  return getDb().project.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      sourceImage: true,
      sourcePreview: true,
      references: { orderBy: { position: "asc" }, include: { file: true } },
    },
  });
}

export async function archiveOwnedProject(userId: string, id: string) {
  const result = await getDb().project.updateMany({
    where: { id, userId, deletedAt: null },
    data: { status: "ARCHIVED", deletedAt: new Date() },
  });
  return result.count > 0;
}
