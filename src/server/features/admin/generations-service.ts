import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { cancelGenerationAsAdmin } from "@/server/features/generations/service";
import { getDb } from "@/server/shared/db/prisma";
import { AdminServiceError } from "./http";
import { generationStatuses, iso, account, pageInfo } from "./presentation";

const generationInclude = {
  user: { select: { id: true, displayName: true, email: true, phone: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.GenerationInclude;

function generationListDto(generation: {
  id: string;
  userId: string;
  projectId: string;
  parentGenerationId: string | null;
  status: (typeof generationStatuses)[number];
  styleCode: string | null;
  aspectRatio: string;
  visualPromptUsed: boolean;
  attemptCount: number;
  durationMs: number | null;
  estimatedCost: { toString(): string } | null;
  errorCode: string | null;
  errorMessage: string | null;
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
  };
  project: { id: string; name: string };
}) {
  return {
    id: generation.id,
    user: { id: generation.user.id, account: account(generation.user) },
    project: generation.project,
    parentGenerationId: generation.parentGenerationId,
    status: generation.status,
    styleCode: generation.styleCode,
    aspectRatio: generation.aspectRatio,
    visualPromptUsed: generation.visualPromptUsed,
    attemptCount: generation.attemptCount,
    durationMs: generation.durationMs,
    estimatedCost: generation.estimatedCost?.toString() ?? null,
    error:
      generation.errorCode || generation.errorMessage
        ? { code: generation.errorCode, message: generation.errorMessage }
        : null,
    queuedAt: generation.queuedAt.toISOString(),
    startedAt: iso(generation.startedAt),
    completedAt: iso(generation.completedAt),
    createdAt: generation.createdAt.toISOString(),
    updatedAt: generation.updatedAt.toISOString(),
    canCancel: generation.status === "QUEUED",
  };
}

export async function listAdminGenerations(input: {
  page: number;
  pageSize: number;
  query?: string;
  status?: (typeof generationStatuses)[number];
  userId?: string;
  projectId?: string;
  from?: string;
  to?: string;
}) {
  const where: Prisma.GenerationWhereInput = {
    deletedAt: null,
    status: input.status,
    userId: input.userId,
    projectId: input.projectId,
    createdAt:
      input.from || input.to
        ? {
            gte: input.from ? new Date(input.from) : undefined,
            lte: input.to ? new Date(input.to) : undefined,
          }
        : undefined,
    ...(input.query
      ? {
          OR: [
            {
              id: /^[0-9a-f-]{36}$/i.test(input.query)
                ? input.query
                : undefined,
            },
            { prompt: { contains: input.query, mode: "insensitive" } },
            {
              project: { name: { contains: input.query, mode: "insensitive" } },
            },
            {
              user: {
                displayName: { contains: input.query, mode: "insensitive" },
              },
            },
            { user: { email: { contains: input.query, mode: "insensitive" } } },
            { user: { phone: { contains: input.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const db = getDb();
  const totalItems = await db.generation.count({ where });
  const rows = await db.generation.findMany({
    where,
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: generationInclude,
  });
  return {
    items: rows.map(generationListDto),
    pageInfo: pageInfo(input.page, input.pageSize, totalItems),
  };
}

function mediaDto(
  file: {
    id: string;
    type: string;
    originalName: string | null;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
  } | null,
) {
  return file
    ? {
        id: file.id,
        type: file.type,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        width: file.width,
        height: file.height,
      }
    : null;
}

const mediaSelect = {
  id: true,
  type: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
} satisfies Prisma.MediaFileSelect;

export async function getAdminGeneration(id: string) {
  const generation = await getDb().generation.findUnique({
    where: { id },
    include: {
      ...generationInclude,
      sourceImage: { select: mediaSelect },
      visualPromptImage: { select: mediaSelect },
      resultOriginal: { select: mediaSelect },
      resultUser: { select: mediaSelect },
      references: {
        orderBy: { position: "asc" },
        select: { position: true, file: { select: mediaSelect } },
      },
      usageEvent: {
        select: {
          id: true,
          status: true,
          creditAmount: true,
          reservedAt: true,
          consumedAt: true,
          refundedAt: true,
          expiresAt: true,
          reason: true,
        },
      },
    },
  });
  if (!generation)
    throw new AdminServiceError("NOT_FOUND", "Генерация не найдена", 404);
  const base = generationListDto(generation);
  return {
    ...base,
    prompt: generation.prompt,
    finalPrompt: generation.finalPrompt,
    providerRequestId: generation.providerRequestId,
    timeline: [
      { status: "QUEUED", at: generation.queuedAt.toISOString() },
      ...(generation.startedAt
        ? [{ status: "PROCESSING", at: generation.startedAt.toISOString() }]
        : []),
      ...(generation.completedAt
        ? [
            {
              status: generation.status,
              at: generation.completedAt.toISOString(),
            },
          ]
        : []),
    ],
    usage: generation.usageEvent
      ? {
          ...generation.usageEvent,
          reservedAt: generation.usageEvent.reservedAt.toISOString(),
          consumedAt: iso(generation.usageEvent.consumedAt),
          refundedAt: iso(generation.usageEvent.refundedAt),
          expiresAt: iso(generation.usageEvent.expiresAt),
        }
      : null,
    media: {
      source: mediaDto(generation.sourceImage),
      visualPrompt: mediaDto(generation.visualPromptImage),
      resultOriginal: mediaDto(generation.resultOriginal),
      resultUser: mediaDto(generation.resultUser),
      references: generation.references.map((reference) => ({
        position: reference.position,
        ...mediaDto(reference.file)!,
      })),
    },
  };
}

export async function cancelAdminGeneration(id: string) {
  const exists = await getDb().generation.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!exists)
    throw new AdminServiceError("NOT_FOUND", "Генерация не найдена", 404);
  if (!(await cancelGenerationAsAdmin(id)))
    throw new AdminServiceError(
      "GENERATION_NOT_CANCELLABLE",
      "Генерацию уже нельзя отменить",
      409,
    );
  return { id, status: "CANCELLED" as const, canCancel: false };
}
