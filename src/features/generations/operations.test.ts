import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelOwnedGenerationWithDatabase,
  createGenerationReservation,
  failGenerationWithDatabase,
  GenerationReservationError,
  reserveIdempotently,
} from "./operations.ts";

type GenerationRow = {
  id: string;
  userId: string;
  idempotencyKey: string;
  status: string;
  deletedAt: Date | null;
  parentGenerationId?: string;
  estimatedCost?: unknown;
};

type UsageEventRow = {
  userId: string;
  generationId: string;
  status: string;
  creditAmount: number;
  refundedAt: Date | null;
  reason: string | null;
};

type JournalRow = {
  kind: string;
  amount: number;
  balanceAfter: number;
  idempotencyKey: string;
  generationId: string | null;
  reason: string | null;
};

type GenerationState = {
  wallets: Map<string, number>;
  generations: Map<string, GenerationRow>;
  usageEvents: Map<string, UsageEventRow>;
  journals: JournalRow[];
};

function replaceMap<K, V>(target: Map<K, V>, source: Map<K, V>) {
  target.clear();
  for (const [key, value] of source) target.set(key, value);
}

function createGenerationHarness(input?: {
  balance?: number;
  generation?: GenerationRow;
  usageEvent?: UsageEventRow;
}) {
  const state: GenerationState = {
    wallets: new Map([["user-1", input?.balance ?? 10]]),
    generations: new Map(
      input?.generation ? [[input.generation.id, input.generation]] : [],
    ),
    usageEvents: new Map(
      input?.usageEvent
        ? [[input.usageEvent.generationId, input.usageEvent]]
        : [],
    ),
    journals: [],
  };

  const tx = {
    async $executeRaw() {
      return 1;
    },
    generation: {
      async findUnique(query: {
        where: {
          userId_idempotencyKey: {
            userId: string;
            idempotencyKey: string;
          };
        };
      }) {
        const key = query.where.userId_idempotencyKey;
        return (
          [...state.generations.values()].find(
            (generation) =>
              generation.userId === key.userId &&
              generation.idempotencyKey === key.idempotencyKey,
          ) ?? null
        );
      },
      async create(query: {
        data: GenerationRow & {
          usageEvent: { create: Omit<UsageEventRow, "generationId"> };
        };
      }) {
        const { usageEvent, ...generation } = query.data;
        if (state.generations.has(generation.id)) {
          throw new Error("UNIQUE_GENERATION");
        }
        state.generations.set(generation.id, generation);
        state.usageEvents.set(generation.id, {
          ...usageEvent.create,
          generationId: generation.id,
        });
        return generation;
      },
      async updateMany(query: {
        where: {
          id: string;
          userId?: string;
          status?: string | { in: string[] };
          deletedAt?: null;
        };
        data: Partial<GenerationRow>;
      }) {
        const generation = state.generations.get(query.where.id);
        const allowedStatuses =
          typeof query.where.status === "string"
            ? [query.where.status]
            : query.where.status?.in;
        if (
          !generation ||
          (query.where.userId && generation.userId !== query.where.userId) ||
          (allowedStatuses && !allowedStatuses.includes(generation.status)) ||
          (query.where.deletedAt === null && generation.deletedAt !== null)
        ) {
          return { count: 0 };
        }
        state.generations.set(generation.id, {
          ...generation,
          ...query.data,
        });
        return { count: 1 };
      },
    },
    usageEvent: {
      async findUnique(query: { where: { generationId: string } }) {
        return state.usageEvents.get(query.where.generationId) ?? null;
      },
      async updateMany(query: {
        where: { generationId: string; status: string };
        data: Partial<UsageEventRow>;
      }) {
        const event = state.usageEvents.get(query.where.generationId);
        if (!event || event.status !== query.where.status) {
          return { count: 0 };
        }
        state.usageEvents.set(event.generationId, {
          ...event,
          ...query.data,
        });
        return { count: 1 };
      },
    },
    creditWallet: {
      async updateMany(query: {
        where: { userId: string; balance: { gte: number } };
        data: { balance: { decrement: number } };
      }) {
        const balance = state.wallets.get(query.where.userId);
        if (balance === undefined || balance < query.where.balance.gte) {
          return { count: 0 };
        }
        state.wallets.set(
          query.where.userId,
          balance - query.data.balance.decrement,
        );
        return { count: 1 };
      },
      async findUniqueOrThrow(query: { where: { userId: string } }) {
        const balance = state.wallets.get(query.where.userId);
        if (balance === undefined) throw new Error("WALLET_NOT_FOUND");
        return { userId: query.where.userId, balance };
      },
      async update(query: {
        where: { userId: string };
        data: { balance: { increment: number } };
      }) {
        const balance = state.wallets.get(query.where.userId);
        if (balance === undefined) throw new Error("WALLET_NOT_FOUND");
        const next = balance + query.data.balance.increment;
        state.wallets.set(query.where.userId, next);
        return { userId: query.where.userId, balance: next };
      },
    },
    creditTransaction: {
      async create(query: { data: JournalRow }) {
        if (
          state.journals.some(
            (entry) => entry.idempotencyKey === query.data.idempotencyKey,
          )
        ) {
          throw new Error("UNIQUE_CREDIT_TRANSACTION");
        }
        state.journals.push(query.data);
        return query.data;
      },
    },
  };

  const db = {
    async $transaction<T>(operation: (transaction: typeof tx) => Promise<T>) {
      const snapshot = structuredClone(state);
      try {
        return await operation(tx);
      } catch (error) {
        replaceMap(state.wallets, snapshot.wallets);
        replaceMap(state.generations, snapshot.generations);
        replaceMap(state.usageEvents, snapshot.usageEvents);
        state.journals.splice(0, state.journals.length, ...snapshot.journals);
        throw error;
      }
    },
  };

  return { db, state };
}

function reservationData(input: {
  generationId: string;
  idempotencyKey: string;
  parentGenerationId?: string;
}) {
  return {
    generationId: input.generationId,
    userId: "user-1",
    estimatedCost: "0.147200",
    data: {
      userId: "user-1",
      idempotencyKey: input.idempotencyKey,
      status: "QUEUED",
      deletedAt: null,
      ...(input.parentGenerationId
        ? { parentGenerationId: input.parentGenerationId }
        : {}),
    },
    usageEvent: {
      usageDate: new Date("2026-07-29T00:00:00.000Z"),
      expiresAt: new Date("2026-07-29T00:15:00.000Z"),
    },
  };
}

test("root reservation stores cost snapshots and debits four credits", async () => {
  const { db, state } = createGenerationHarness();

  await db.$transaction((tx) =>
    reserveIdempotently(
      tx,
      { userId: "user-1", idempotencyKey: "root-key" },
      () =>
        createGenerationReservation(
          tx,
          reservationData({
            generationId: "generation-root",
            idempotencyKey: "root-key",
          }),
        ),
    ),
  );

  assert.equal(state.wallets.get("user-1"), 6);
  assert.equal(
    state.generations.get("generation-root")?.estimatedCost,
    "0.147200",
  );
  assert.equal(
    state.usageEvents.get("generation-root")?.creditAmount,
    4,
  );
  assert.deepEqual(
    state.journals.map(({ kind, amount, generationId }) => ({
      kind,
      amount,
      generationId,
    })),
    [
      {
        kind: "GENERATION_DEBIT",
        amount: -4,
        generationId: "generation-root",
      },
    ],
  );
});

test("insufficient root credits roll back generation and usage snapshots", async () => {
  const { db, state } = createGenerationHarness({ balance: 3 });

  await assert.rejects(
    () =>
      db.$transaction((tx) =>
        reserveIdempotently(
          tx,
          { userId: "user-1", idempotencyKey: "root-key" },
          () =>
            createGenerationReservation(
              tx,
              reservationData({
                generationId: "generation-root",
                idempotencyKey: "root-key",
              }),
            ),
        ),
      ),
    (error) =>
      error instanceof GenerationReservationError &&
      error.code === "INSUFFICIENT_CREDITS",
  );

  assert.equal(state.wallets.get("user-1"), 3);
  assert.equal(state.generations.size, 0);
  assert.equal(state.usageEvents.size, 0);
  assert.equal(state.journals.length, 0);
});

test("refinement reservation debits four credits", async () => {
  const { db, state } = createGenerationHarness();

  await db.$transaction((tx) =>
    reserveIdempotently(
      tx,
      { userId: "user-1", idempotencyKey: "refinement-key" },
      () =>
        createGenerationReservation(
          tx,
          reservationData({
            generationId: "generation-refinement",
            idempotencyKey: "refinement-key",
            parentGenerationId: "generation-parent",
          }),
        ),
    ),
  );

  assert.equal(state.wallets.get("user-1"), 6);
  assert.equal(
    state.generations.get("generation-refinement")?.parentGenerationId,
    "generation-parent",
  );
  assert.equal(
    state.usageEvents.get("generation-refinement")?.creditAmount,
    4,
  );
});

test("idempotent reservation repeat returns the original without a second debit", async () => {
  const { db, state } = createGenerationHarness();
  const reserve = () =>
    db.$transaction((tx) =>
      reserveIdempotently(
        tx,
        { userId: "user-1", idempotencyKey: "root-key" },
        () =>
          createGenerationReservation(
            tx,
            reservationData({
              generationId: "generation-root",
              idempotencyKey: "root-key",
            }),
          ),
      ),
    );

  const first = await reserve();
  const repeated = await reserve();

  assert.equal(first.isExisting, false);
  assert.equal(repeated.isExisting, true);
  assert.equal(repeated.generation.id, "generation-root");
  assert.equal(state.wallets.get("user-1"), 6);
  assert.equal(state.journals.length, 1);
});

test("worker failure refunds the stored amount exactly once", async () => {
  const { db, state } = createGenerationHarness({
    balance: 3,
    generation: {
      id: "generation-1",
      userId: "user-1",
      idempotencyKey: "root-key",
      status: "PROCESSING",
      deletedAt: null,
    },
    usageEvent: {
      userId: "user-1",
      generationId: "generation-1",
      status: "RESERVED",
      creditAmount: 7,
      refundedAt: null,
      reason: null,
    },
  });

  await failGenerationWithDatabase(db, {
    generationId: "generation-1",
    code: "PROVIDER_TIMEOUT",
    message: "provider failed",
  });
  await failGenerationWithDatabase(db, {
    generationId: "generation-1",
    code: "PROVIDER_TIMEOUT",
    message: "provider failed",
  });

  assert.equal(state.generations.get("generation-1")?.status, "FAILED");
  assert.equal(state.usageEvents.get("generation-1")?.status, "REFUNDED");
  assert.equal(state.wallets.get("user-1"), 10);
  assert.deepEqual(
    state.journals.map(({ kind, amount, reason }) => ({
      kind,
      amount,
      reason,
    })),
    [
      {
        kind: "TECHNICAL_REFUND",
        amount: 7,
        reason: "PROVIDER_TIMEOUT",
      },
    ],
  );
});

test("queued cancellation refunds the stored reservation", async () => {
  const { db, state } = createGenerationHarness({
    balance: 6,
    generation: {
      id: "generation-1",
      userId: "user-1",
      idempotencyKey: "root-key",
      status: "QUEUED",
      deletedAt: null,
    },
    usageEvent: {
      userId: "user-1",
      generationId: "generation-1",
      status: "RESERVED",
      creditAmount: 4,
      refundedAt: null,
      reason: null,
    },
  });

  const cancelled = await cancelOwnedGenerationWithDatabase(
    db,
    "user-1",
    "generation-1",
  );

  assert.equal(cancelled, true);
  assert.equal(state.generations.get("generation-1")?.status, "CANCELLED");
  assert.equal(state.usageEvents.get("generation-1")?.status, "REFUNDED");
  assert.equal(state.wallets.get("user-1"), 10);
  assert.equal(state.journals[0]?.kind, "CANCELLATION_REFUND");
});

test("processing cancellation neither cancels nor refunds", async () => {
  const { db, state } = createGenerationHarness({
    balance: 6,
    generation: {
      id: "generation-1",
      userId: "user-1",
      idempotencyKey: "root-key",
      status: "PROCESSING",
      deletedAt: null,
    },
    usageEvent: {
      userId: "user-1",
      generationId: "generation-1",
      status: "RESERVED",
      creditAmount: 4,
      refundedAt: null,
      reason: null,
    },
  });

  const cancelled = await cancelOwnedGenerationWithDatabase(
    db,
    "user-1",
    "generation-1",
  );

  assert.equal(cancelled, false);
  assert.equal(state.generations.get("generation-1")?.status, "PROCESSING");
  assert.equal(state.usageEvents.get("generation-1")?.status, "RESERVED");
  assert.equal(state.wallets.get("user-1"), 6);
  assert.equal(state.journals.length, 0);
});
