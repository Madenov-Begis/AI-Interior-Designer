import type { Prisma, Generation } from "../../../generated/prisma/client.ts";
import type { AspectRatio } from "../../../generated/prisma/enums.ts";
import { GENERATION_CREDIT_COST } from "../../shared/config/product.ts";
import {
  CreditBalanceError,
  debitGenerationCredits,
  refundReservedGeneration,
} from "../credits/service-operations.ts";
import { getInteriorStyle, type InteriorStyleCode } from "./interior-styles.ts";
import { buildRefinementSnapshot } from "./refinement-policy.ts";
import {
  getGenerationModelConfig,
  supportedGenerationAspectRatios,
} from "./model-config.ts";
import type {
  VisualPromptCanvasState,
  VisualPromptPlacementRegion,
} from "../visual-prompt/types.ts";
import type { RoomTypeSnapshot } from "../rooms/types.ts";

export type GenerationDatabase = {
  $transaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
};

type GenerationReservationData = Omit<
  Prisma.GenerationUncheckedCreateInput,
  "id" | "estimatedCost" | "usageEvent"
>;

type BuildFinalPrompt = (input: {
  prompt: string;
  visualPromptUsed: boolean;
  referenceCount: number;
  placementRegions?: VisualPromptPlacementRegion[];
  stylePrompt?: string;
  room?: RoomTypeSnapshot;
}) => string;

type ReservationDependencies = {
  db: GenerationDatabase;
  aiProvider: string | undefined;
  buildFinalPrompt: BuildFinalPrompt;
  buildRefinementPrompt: BuildFinalPrompt;
  randomUUID: () => string;
  now: () => Date;
  limits: {
    maxParallelGenerations: number;
    maxReferenceImages: number;
  };
};

export type RootGenerationReservationInput = {
  userId: string;
  projectId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  styleCode?: InteriorStyleCode;
  roomTypeId?: string;
  roomSnapshot?: RoomTypeSnapshot;
  visualPromptImageId?: string | null;
  visualPromptState?: VisualPromptCanvasState;
  idempotencyKey: string;
};

export type RefinementReservationInput = {
  userId: string;
  parentGenerationId: string;
  prompt: string;
  referenceFileIds: string[];
  visualPromptImageId?: string;
  visualPromptState?: VisualPromptCanvasState;
  idempotencyKey: string;
};

export class GenerationReservationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GenerationReservationError";
    this.code = code;
  }
}

export function usageDateInTimezone(
  timezone = "Asia/Tashkent",
  now = new Date(),
) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${day}T00:00:00.000Z`);
}

export async function reserveIdempotently(
  transaction: Prisma.TransactionClient,
  input: { userId: string; idempotencyKey: string },
  create: () => Promise<Generation>,
): Promise<{ generation: Generation; isExisting: boolean }> {
  const existing = await transaction.generation.findUnique({
    where: {
      userId_idempotencyKey: {
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (existing) {
    return {
      generation: existing,
      isExisting: true,
    };
  }

  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.userId}, 0))`;
  const duplicate = await transaction.generation.findUnique({
    where: {
      userId_idempotencyKey: {
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (duplicate) {
    return {
      generation: duplicate,
      isExisting: true,
    };
  }

  return {
    generation: await create(),
    isExisting: false,
  };
}

export async function createGenerationReservation(
  transaction: Prisma.TransactionClient,
  input: {
    generationId: string;
    userId: string;
    estimatedCost: Prisma.GenerationUncheckedCreateInput["estimatedCost"];
    data: GenerationReservationData;
    usageEvent: {
      usageDate: Date;
      expiresAt: Date;
    };
  },
): Promise<Generation> {
  const generation = await transaction.generation.create({
    data: {
      ...input.data,
      id: input.generationId,
      estimatedCost: input.estimatedCost,
      usageEvent: {
        create: {
          userId: input.userId,
          status: "RESERVED",
          creditAmount: GENERATION_CREDIT_COST,
          usageDate: input.usageEvent.usageDate,
          expiresAt: input.usageEvent.expiresAt,
        },
      },
    },
  });

  try {
    await debitGenerationCredits(transaction, {
      userId: input.userId,
      generationId: input.generationId,
      amount: GENERATION_CREDIT_COST,
    });
  } catch (error) {
    if (
      error instanceof CreditBalanceError &&
      error.code === "INSUFFICIENT_CREDITS"
    ) {
      throw new GenerationReservationError(
        "INSUFFICIENT_CREDITS",
        "Недостаточно кредитов для генерации",
      );
    }
    throw error;
  }

  return generation;
}

export async function reserveRootGenerationWithDependencies(
  dependencies: ReservationDependencies,
  input: RootGenerationReservationInput,
) {
  const database = dependencies.db;
  return database.$transaction((tx) =>
    reserveIdempotently(
      tx,
      {
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
      async () => {
        const now = dependencies.now();
        const profile = await tx.profile.findUnique({
          where: { id: input.userId },
        });
        if (!profile || profile.status !== "ACTIVE") {
          throw new GenerationReservationError(
            profile?.status === "BLOCKED"
              ? "USER_BLOCKED"
              : "PROFILE_NOT_FOUND",
            "Профиль недоступен",
          );
        }
        const project = await tx.project.findFirst({
          where: {
            id: input.projectId,
            userId: input.userId,
            deletedAt: null,
          },
          include: {
            sourceImage: true,
            visualPrompt: true,
            references: {
              orderBy: { position: "asc" },
              include: { file: true },
            },
          },
        });
        if (!project?.sourceImage) {
          throw new GenerationReservationError(
            "PROJECT_NOT_READY",
            "Сначала загрузите фотографию помещения",
          );
        }

        let visualPrompt = project.visualPrompt;
        if (input.visualPromptImageId !== undefined) {
          visualPrompt = input.visualPromptImageId
            ? await tx.mediaFile.findFirst({
                where: {
                  id: input.visualPromptImageId,
                  ownerId: input.userId,
                  type: "VISUAL_PROMPT",
                  deletedAt: null,
                },
              })
            : null;
          if (input.visualPromptImageId && !visualPrompt) {
            throw new GenerationReservationError(
              "VISUAL_PROMPT_NOT_FOUND",
              "Разметка недоступна",
            );
          }
        }

        const model = getGenerationModelConfig(dependencies.aiProvider);
        if (!supportedGenerationAspectRatios.includes(input.aspectRatio)) {
          throw new GenerationReservationError(
            "MODEL_NOT_ALLOWED",
            "Модель не поддерживает выбранный формат",
          );
        }

        const parallel = await tx.generation.count({
          where: {
            userId: input.userId,
            status: { in: ["QUEUED", "PROCESSING"] },
            deletedAt: null,
          },
        });
        if (parallel >= dependencies.limits.maxParallelGenerations) {
          throw new GenerationReservationError(
            "GENERATION_ALREADY_RUNNING",
            "Дождитесь завершения текущей генерации",
          );
        }

        const usageDate = usageDateInTimezone(profile.timezone, now);
        const room = input.roomSnapshot
          ? input.roomSnapshot
          : input.roomTypeId
            ? await tx.roomType.findFirst({
                where: { id: input.roomTypeId, active: true },
                select: {
                  id: true,
                  code: true,
                  name: true,
                  promptModifier: true,
                },
              })
            : undefined;
        if (input.roomTypeId && !room) {
          throw new GenerationReservationError(
            "ROOM_NOT_AVAILABLE",
            "Выбранная комната больше недоступна",
          );
        }
        const style = getInteriorStyle(input.styleCode);
        const finalPrompt = dependencies.buildFinalPrompt({
          prompt: input.prompt,
          visualPromptUsed: Boolean(visualPrompt),
          referenceCount: project.references.length,
          placementRegions:
            input.visualPromptState?.version === 2
              ? input.visualPromptState.placementRegions
              : undefined,
          stylePrompt: style?.promptModifier,
          room: room ?? undefined,
        });
        const generationId = dependencies.randomUUID();
        const generation = await createGenerationReservation(tx, {
          generationId,
          userId: input.userId,
          estimatedCost: model.costPerGeneration,
          data: {
            userId: input.userId,
            projectId: project.id,
            idempotencyKey: input.idempotencyKey,
            prompt: input.prompt,
            styleCode: input.styleCode ?? null,
            roomTypeId: room?.id ?? null,
            roomCode: room?.code ?? null,
            roomName: room?.name ?? null,
            roomPrompt: room?.promptModifier ?? null,
            finalPrompt,
            aspectRatio: input.aspectRatio,
            visualPromptUsed: Boolean(visualPrompt),
            sourceImageId: project.sourceImage.id,
            visualPromptImageId: visualPrompt?.id ?? null,
            references: {
              create: project.references.map((reference) => ({
                fileId: reference.fileId,
                position: reference.position,
              })),
            },
          },
          usageEvent: {
            usageDate,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          },
        });
        await tx.project.update({
          where: { id: project.id },
          data: {
            prompt: input.prompt,
            aspectRatio: input.aspectRatio,
            // Canvas autosave owns project markup. A generation snapshots its
            // input independently and must not overwrite a newer editor save.
          },
        });
        return generation;
      },
    ),
  );
}

export async function reserveRefinementWithDependencies(
  dependencies: ReservationDependencies,
  input: RefinementReservationInput,
) {
  const database = dependencies.db;
  return database.$transaction((tx) =>
    reserveIdempotently(
      tx,
      {
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
      async () => {
        const now = dependencies.now();
        const profile = await tx.profile.findUnique({
          where: { id: input.userId },
        });
        if (!profile || profile.status !== "ACTIVE") {
          throw new GenerationReservationError(
            profile?.status === "BLOCKED"
              ? "USER_BLOCKED"
              : "PROFILE_NOT_FOUND",
            "Профиль недоступен",
          );
        }

        const model = getGenerationModelConfig(dependencies.aiProvider);
        const parent = await tx.generation.findFirst({
          where: {
            id: input.parentGenerationId,
            userId: input.userId,
            deletedAt: null,
          },
          select: {
            id: true,
            projectId: true,
            styleCode: true,
            roomTypeId: true,
            roomCode: true,
            roomName: true,
            roomPrompt: true,
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

        if (
          input.referenceFileIds.length > dependencies.limits.maxReferenceImages
        ) {
          throw new GenerationReservationError(
            "REFERENCE_LIMIT_EXCEEDED",
            `Можно использовать не более ${dependencies.limits.maxReferenceImages} референсов`,
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

        const parallel = await tx.generation.count({
          where: {
            userId: input.userId,
            status: { in: ["QUEUED", "PROCESSING"] },
            deletedAt: null,
          },
        });
        if (parallel >= dependencies.limits.maxParallelGenerations) {
          throw new GenerationReservationError(
            "GENERATION_ALREADY_RUNNING",
            "Дождитесь завершения текущей генерации",
          );
        }

        const usageDate = usageDateInTimezone(profile.timezone, now);
        const finalPrompt = dependencies.buildRefinementPrompt({
          prompt: input.prompt,
          visualPromptUsed: Boolean(input.visualPromptImageId),
          referenceCount: input.referenceFileIds.length,
          placementRegions:
            input.visualPromptState?.version === 2
              ? input.visualPromptState.placementRegions
              : undefined,
          room:
            snapshot.roomTypeId &&
            snapshot.roomCode &&
            snapshot.roomName &&
            snapshot.roomPrompt
              ? {
                  id: snapshot.roomTypeId,
                  code: snapshot.roomCode,
                  name: snapshot.roomName,
                  promptModifier: snapshot.roomPrompt,
                }
              : undefined,
        });
        const generationId = dependencies.randomUUID();
        return createGenerationReservation(tx, {
          generationId,
          userId: input.userId,
          estimatedCost: model.costPerGeneration,
          data: {
            userId: input.userId,
            idempotencyKey: input.idempotencyKey,
            prompt: input.prompt,
            finalPrompt,
            visualPromptUsed: Boolean(input.visualPromptImageId),
            visualPromptImageId: input.visualPromptImageId ?? null,
            ...snapshot,
            references: {
              create: input.referenceFileIds.map((fileId, position) => ({
                fileId,
                position,
              })),
            },
          },
          usageEvent: {
            usageDate,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          },
        });
      },
    ),
  );
}

export async function failGenerationWithDatabase(
  db: GenerationDatabase,
  input: {
    generationId: string;
    code: string;
    message: string;
  },
) {
  const database = db;
  return database.$transaction(async (tx) => {
    const failed = await tx.generation.updateMany({
      where: {
        id: input.generationId,
        status: { in: ["QUEUED", "PROCESSING"] },
      },
      data: {
        status: "FAILED",
        errorCode: input.code,
        errorMessage: input.message.slice(0, 500),
        completedAt: new Date(),
      },
    });
    if (failed.count === 0) return false;
    await refundReservedGeneration(tx, {
      generationId: input.generationId,
      kind: "TECHNICAL_REFUND",
      reason: input.code,
    });
    return true;
  });
}

export async function cancelOwnedGenerationWithDatabase(
  db: GenerationDatabase,
  userId: string,
  generationId: string,
) {
  const database = db;
  return database.$transaction(async (tx) => {
    const cancelled = await tx.generation.updateMany({
      where: {
        id: generationId,
        userId,
        status: "QUEUED",
        deletedAt: null,
      },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });
    if (cancelled.count === 0) return false;
    await refundReservedGeneration(tx, {
      generationId,
      kind: "CANCELLATION_REFUND",
      reason: "USER_CANCELLED",
    });
    return true;
  });
}
