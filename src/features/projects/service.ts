import "server-only";

import { getDb } from "@/lib/db";

const projectSummarySelect = {
  id: true,
  name: true,
  status: true,
  aspectRatio: true,
  createdAt: true,
  updatedAt: true,
  sourcePreview: { select: { id: true, width: true, height: true } },
} as const;

export function createProject(userId: string, name: string) {
  return getDb().project.create({ data: { userId, name }, select: projectSummarySelect });
}

export async function listProjects(userId: string, limit: number, cursor?: string) {
  const rows = await getDb().project.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: projectSummarySelect,
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export function findOwnedProject(userId: string, id: string) {
  return getDb().project.findFirst({
    where: { id, userId, deletedAt: null },
    include: { sourceImage: true, sourcePreview: true, references: { orderBy: { position: "asc" }, include: { file: true } } },
  });
}
