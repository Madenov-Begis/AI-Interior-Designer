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

export async function updateOwnedProject(userId: string, id: string, data: { name?: string; prompt?: string | null; aspectRatio?: "RATIO_1_1" | "RATIO_16_9" | "RATIO_9_16" | "RATIO_4_3" | "RATIO_3_4"; modelId?: string | null; status?: "DRAFT" | "READY" | "ARCHIVED" }) {
  const found = await getDb().project.findFirst({ where: { id, userId, deletedAt: null }, select: { id: true } });
  if (!found) return null;
  return getDb().project.update({ where: { id }, data, select: projectSummarySelect });
}

export async function archiveOwnedProject(userId: string, id: string) {
  const result = await getDb().project.updateMany({ where: { id, userId, deletedAt: null }, data: { status: "ARCHIVED", deletedAt: new Date() } });
  return result.count > 0;
}

export async function duplicateOwnedProject(userId: string, id: string) {
  const source = await getDb().project.findFirst({ where: { id, userId, deletedAt: null }, include: { references: { orderBy: { position: "asc" } } } });
  if (!source) return null;
  return getDb().project.create({ data: { userId, name: `${source.name} — копия`.slice(0, 120), prompt: source.prompt, modelId: source.modelId, aspectRatio: source.aspectRatio, sourceImageId: source.sourceImageId, sourcePreviewId: source.sourcePreviewId, visualPromptId: source.visualPromptId, canvasState: source.canvasState ?? undefined, visualPromptUsed: source.visualPromptUsed, references: { create: source.references.map((reference) => ({ fileId: reference.fileId, sourceUrl: reference.sourceUrl, position: reference.position })) } }, select: projectSummarySelect });
}
