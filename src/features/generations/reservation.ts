import "server-only";

import type { AspectRatio } from "@/generated/prisma/enums";
import { ensureSystemDefaults } from "@/features/plans/defaults";
import { getInteriorStyle, type InteriorStyleCode } from "@/features/generations/interior-styles";
import { buildFinalPrompt } from "@/features/generations/prompt";
import { buildRefinementSnapshot } from "@/features/generations/refinement-policy";
import { resolveRequiredProvider } from "@/features/generations/reservation-policy";
import { getDb } from "@/lib/db";

export class GenerationReservationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "GenerationReservationError";
  }
}

export function usageDateInTimezone(timezone = "Asia/Tashkent", now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${day}T00:00:00.000Z`);
}

export async function reserveRootGeneration(input: {
  userId: string;
  projectId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  styleCode?: InteriorStyleCode;
  idempotencyKey: string;
}) {
  const defaults = await ensureSystemDefaults();
  const db = getDb();
  return db.$transaction(async (tx) => {
    const existing = await tx.generation.findUnique({
      where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) return { generation: existing, isExisting: true };

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.userId}, 0))`;
    const duplicate = await tx.generation.findUnique({
      where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey } },
    });
    if (duplicate) return { generation: duplicate, isExisting: true };

    const profile = await tx.profile.findUnique({
      where: { id: input.userId },
      include: { plan: true, subscriptions: { where: { status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, orderBy: { startsAt: "desc" }, take: 1, include: { plan: true } } },
    });
    if (!profile || profile.status !== "ACTIVE") throw new GenerationReservationError(profile?.status === "BLOCKED" ? "USER_BLOCKED" : "PROFILE_NOT_FOUND", "Профиль недоступен");
    const plan = profile.subscriptions[0]?.plan ?? profile.plan ?? defaults.freePlan;
    const dailyLimit = profile.dailyLimitOverride ?? plan.dailyGenerationLimit;
    const maxParallel = profile.maxParallelOverride ?? plan.maxParallelGenerations;

    const project = await tx.project.findFirst({
      where: { id: input.projectId, userId: input.userId, deletedAt: null },
      include: { sourceImage: true, visualPrompt: true, references: { orderBy: { position: "asc" }, include: { file: true } } },
    });
    if (!project?.sourceImage) throw new GenerationReservationError("PROJECT_NOT_READY", "Сначала загрузите фотографию помещения");

    const model = await tx.aiModel.findFirst({
      where: {
        active: true,
        provider: resolveRequiredProvider(process.env.AI_PROVIDER),
        plans: { some: { planId: plan.id } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
    if (!model) throw new GenerationReservationError("MODEL_NOT_FOUND", "Модель недоступна");
    if (!model.supportedAspectRatios.includes(input.aspectRatio)) throw new GenerationReservationError("MODEL_NOT_ALLOWED", "Модель не поддерживает выбранный формат");

    const parallel = await tx.generation.count({ where: { userId: input.userId, status: { in: ["QUEUED", "PROCESSING"] }, deletedAt: null } });
    if (parallel >= maxParallel) throw new GenerationReservationError("GENERATION_ALREADY_RUNNING", "Дождитесь завершения текущей генерации");

    const usageDate = usageDateInTimezone(profile.timezone);
    if (dailyLimit !== null) {
      const used = await tx.usageEvent.count({ where: { userId: input.userId, usageDate, status: { in: ["RESERVED", "CONSUMED"] } } });
      if (used >= dailyLimit) throw new GenerationReservationError("GENERATION_LIMIT_EXCEEDED", "Дневной лимит исчерпан");
    }

    const style = getInteriorStyle(input.styleCode);
    const finalPrompt = buildFinalPrompt({
      prompt: input.prompt,
      visualPromptUsed: project.visualPromptUsed && Boolean(project.visualPrompt),
      referenceCount: project.references.length,
      stylePrompt: style?.promptModifier,
    });
    const generation = await tx.generation.create({
      data: {
        userId: input.userId,
        projectId: project.id,
        modelId: model.id,
        idempotencyKey: input.idempotencyKey,
        prompt: input.prompt,
        styleCode: input.styleCode ?? null,
        finalPrompt,
        aspectRatio: input.aspectRatio,
        visualPromptUsed: project.visualPromptUsed && Boolean(project.visualPrompt),
        sourceImageId: project.sourceImage.id,
        visualPromptImageId: project.visualPromptUsed ? project.visualPrompt?.id ?? null : null,
        references: { create: project.references.map((reference) => ({ fileId: reference.fileId, position: reference.position })) },
        usageEvent: { create: { userId: input.userId, status: "RESERVED", usageDate, expiresAt: new Date(Date.now() + 15 * 60 * 1000) } },
      },
    });
    await tx.project.update({ where: { id: project.id }, data: { prompt: input.prompt, modelId: model.id, aspectRatio: input.aspectRatio } });
    return { generation, isExisting: false };
  });
}

export async function reserveRefinement(input: {
  userId: string;
  parentGenerationId: string;
  prompt: string;
  referenceFileIds: string[];
  visualPromptImageId?: string;
  idempotencyKey: string;
}) {
  const defaults = await ensureSystemDefaults();
  const db = getDb();

  return db.$transaction(async (tx) => {
    const existing = await tx.generation.findUnique({
      where: {
        userId_idempotencyKey: {
          userId: input.userId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (existing) return { generation: existing, isExisting: true };

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.userId}, 0))`;

    const duplicate = await tx.generation.findUnique({
      where: {
        userId_idempotencyKey: {
          userId: input.userId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (duplicate) return { generation: duplicate, isExisting: true };

    const profile = await tx.profile.findUnique({
      where: { id: input.userId },
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
    if (!profile || profile.status !== "ACTIVE") {
      throw new GenerationReservationError(
        profile?.status === "BLOCKED" ? "USER_BLOCKED" : "PROFILE_NOT_FOUND",
        "Профиль недоступен",
      );
    }

    const plan = profile.subscriptions[0]?.plan ?? profile.plan ?? defaults.freePlan;
    const parent = await tx.generation.findFirst({
      where: {
        id: input.parentGenerationId,
        userId: input.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        projectId: true,
        modelId: true,
        styleCode: true,
        aspectRatio: true,
        resultOriginalId: true,
        status: true,
        project: { select: { deletedAt: true } },
      },
    });
    if (!parent || parent.project.deletedAt) {
      throw new GenerationReservationError(
        "GENERATION_NOT_FOUND",
        "Генерация не найдена",
      );
    }

    let snapshot: ReturnType<typeof buildRefinementSnapshot>;
    try {
      snapshot = buildRefinementSnapshot(parent);
    } catch {
      throw new GenerationReservationError(
        "GENERATION_NOT_REFINABLE",
        "Этот результат нельзя доработать",
      );
    }

    if (input.referenceFileIds.length > plan.maxReferenceImages) {
      throw new GenerationReservationError(
        "REFERENCE_LIMIT_EXCEEDED",
        `Можно использовать не более ${plan.maxReferenceImages} референсов`,
      );
    }
    const referenceFiles = input.referenceFileIds.length
      ? await tx.mediaFile.findMany({
          where: {
            id: { in: input.referenceFileIds },
            ownerId: input.userId,
            type: "REFERENCE",
            deletedAt: null,
          },
          select: { id: true },
        })
      : [];
    const referenceIds = new Set(referenceFiles.map((file) => file.id));
    if (input.referenceFileIds.some((id) => !referenceIds.has(id))) {
      throw new GenerationReservationError(
        "REFERENCE_NOT_FOUND",
        "Один из референсов недоступен",
      );
    }

    if (input.visualPromptImageId) {
      const visualPrompt = await tx.mediaFile.findFirst({
        where: {
          id: input.visualPromptImageId,
          ownerId: input.userId,
          type: "VISUAL_PROMPT",
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!visualPrompt) {
        throw new GenerationReservationError(
          "VISUAL_PROMPT_NOT_FOUND",
          "Разметка недоступна",
        );
      }
    }

    const maxParallel = profile.maxParallelOverride ?? plan.maxParallelGenerations;
    const parallel = await tx.generation.count({
      where: {
        userId: input.userId,
        status: { in: ["QUEUED", "PROCESSING"] },
        deletedAt: null,
      },
    });
    if (parallel >= maxParallel) {
      throw new GenerationReservationError(
        "GENERATION_ALREADY_RUNNING",
        "Дождитесь завершения текущей генерации",
      );
    }

    const dailyLimit = profile.dailyLimitOverride ?? plan.dailyGenerationLimit;
    const usageDate = usageDateInTimezone(profile.timezone);
    if (dailyLimit !== null) {
      const used = await tx.usageEvent.count({
        where: {
          userId: input.userId,
          usageDate,
          status: { in: ["RESERVED", "CONSUMED"] },
        },
      });
      if (used >= dailyLimit) {
        throw new GenerationReservationError(
          "GENERATION_LIMIT_EXCEEDED",
          "Дневной лимит исчерпан",
        );
      }
    }

    const finalPrompt = buildFinalPrompt({
      prompt: input.prompt,
      visualPromptUsed: Boolean(input.visualPromptImageId),
      referenceCount: input.referenceFileIds.length,
    });
    const generation = await tx.generation.create({
      data: {
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
        prompt: input.prompt,
        finalPrompt,
        visualPromptUsed: Boolean(input.visualPromptImageId),
        visualPromptImageId: input.visualPromptImageId,
        ...snapshot,
        references: {
          create: input.referenceFileIds.map((fileId, position) => ({
            fileId,
            position,
          })),
        },
        usageEvent: {
          create: {
            userId: input.userId,
            status: "RESERVED",
            usageDate,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        },
      },
    });
    return { generation, isExisting: false };
  });
}
