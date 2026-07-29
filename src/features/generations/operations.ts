import type {
  Generation,
  Prisma,
} from "../../generated/prisma/client.ts";
import { GENERATION_CREDIT_COST } from "../../config/product.ts";
import {
  CreditBalanceError,
  debitGenerationCredits,
  refundReservedGeneration,
} from "../credits/service-operations.ts";

type GenerationDatabase = {
  $transaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
};

export class GenerationReservationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GenerationReservationError";
    this.code = code;
  }
}

export async function reserveIdempotently<
  TTransaction,
  TGeneration extends { id: string },
>(
  tx: TTransaction,
  input: {
    userId: string;
    idempotencyKey: string;
  },
  create: () => Promise<TGeneration>,
): Promise<{ generation: TGeneration; isExisting: boolean }> {
  const transaction = tx as unknown as Prisma.TransactionClient;
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
      generation: existing as unknown as TGeneration,
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
      generation: duplicate as unknown as TGeneration,
      isExisting: true,
    };
  }

  return {
    generation: await create(),
    isExisting: false,
  };
}

export async function createGenerationReservation<TTransaction>(
  tx: TTransaction,
  input: {
    generationId: string;
    userId: string;
    estimatedCost: unknown;
    data: Record<string, unknown>;
    usageEvent: {
      usageDate: Date;
      expiresAt: Date;
    };
  },
): Promise<Generation> {
  const transaction = tx as unknown as Prisma.TransactionClient;
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
    } as Prisma.GenerationCreateInput,
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

export async function failGenerationWithDatabase<TDatabase>(
  db: TDatabase,
  input: {
    generationId: string;
    code: string;
    message: string;
  },
) {
  const database = db as unknown as GenerationDatabase;
  await database.$transaction(async (tx) => {
    await tx.generation.updateMany({
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
    await refundReservedGeneration(tx, {
      generationId: input.generationId,
      kind: "TECHNICAL_REFUND",
      reason: input.code,
    });
  });
}

export async function cancelOwnedGenerationWithDatabase<TDatabase>(
  db: TDatabase,
  userId: string,
  generationId: string,
) {
  const database = db as unknown as GenerationDatabase;
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
