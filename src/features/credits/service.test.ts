import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../../generated/prisma/client.ts";
import {
  creditPaidOrder,
  CreditBalanceError,
  debitGenerationCredits,
  ensureCreditWallet,
  getCreditWalletWithDatabase,
  refundReservedGeneration,
} from "./service-operations.ts";

type WalletRow = {
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
};

type TransactionRow = {
  id: string;
  userId: string;
  kind:
    | "SIGNUP_GRANT"
    | "PURCHASE"
    | "GENERATION_DEBIT"
    | "TECHNICAL_REFUND"
    | "CANCELLATION_REFUND"
    | "ADMIN_ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  idempotencyKey: string;
  orderId: string | null;
  generationId: string | null;
  reason: string | null;
  createdAt: Date;
};

type UsageEventRow = {
  userId: string;
  generationId: string;
  status: "RESERVED" | "CONSUMED" | "REFUNDED" | "EXPIRED";
  creditAmount: number;
  refundedAt: Date | null;
  reason: string | null;
};

type PaymentOrderRow = {
  id: string;
  userId: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
  credits: number;
  creditedAt: Date | null;
};

type CreditState = {
  wallets: Map<string, WalletRow>;
  transactions: TransactionRow[];
  usageEvents: Map<string, UsageEventRow>;
  paymentOrders: Map<string, PaymentOrderRow>;
};

function cloneCreditState(state: CreditState): CreditState {
  return {
    wallets: new Map(
      [...state.wallets].map(([userId, wallet]) => [
        userId,
        {
          ...wallet,
          createdAt: new Date(wallet.createdAt),
          updatedAt: new Date(wallet.updatedAt),
        },
      ]),
    ),
    transactions: state.transactions.map((transaction) => ({
      ...transaction,
      createdAt: new Date(transaction.createdAt),
    })),
    usageEvents: new Map(
      [...state.usageEvents].map(([generationId, usageEvent]) => [
        generationId,
        {
          ...usageEvent,
          refundedAt: usageEvent.refundedAt
            ? new Date(usageEvent.refundedAt)
            : null,
        },
      ]),
    ),
    paymentOrders: new Map(
      [...state.paymentOrders].map(([orderId, order]) => [
        orderId,
        {
          ...order,
          creditedAt: order.creditedAt ? new Date(order.creditedAt) : null,
        },
      ]),
    ),
  };
}

function rowChanged<T>(before: T | undefined, after: T) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function mergeCreditState(
  committed: CreditState,
  base: CreditState,
  working: CreditState,
) {
  const addedTransactions = working.transactions.filter(
    (transaction) =>
      !base.transactions.some((existing) => existing.id === transaction.id),
  );
  for (const transaction of addedTransactions) {
    if (
      committed.transactions.some(
        (existing) => existing.idempotencyKey === transaction.idempotencyKey,
      )
    ) {
      throw new Error("UNIQUE_CREDIT_TRANSACTION");
    }
  }

  for (const [userId, wallet] of working.wallets) {
    if (rowChanged(base.wallets.get(userId), wallet)) {
      committed.wallets.set(userId, {
        ...wallet,
        createdAt: new Date(wallet.createdAt),
        updatedAt: new Date(wallet.updatedAt),
      });
    }
  }
  for (const [generationId, usageEvent] of working.usageEvents) {
    if (rowChanged(base.usageEvents.get(generationId), usageEvent)) {
      committed.usageEvents.set(generationId, {
        ...usageEvent,
        refundedAt: usageEvent.refundedAt
          ? new Date(usageEvent.refundedAt)
          : null,
      });
    }
  }
  for (const [orderId, order] of working.paymentOrders) {
    if (rowChanged(base.paymentOrders.get(orderId), order)) {
      committed.paymentOrders.set(orderId, {
        ...order,
        creditedAt: order.creditedAt ? new Date(order.creditedAt) : null,
      });
    }
  }
  committed.transactions.push(
    ...addedTransactions.map((transaction) => ({
      ...transaction,
      createdAt: new Date(transaction.createdAt),
    })),
  );
}

function createCreditHarness(seed?: Partial<CreditState>) {
  const state: CreditState = {
    wallets: seed?.wallets ?? new Map(),
    transactions: seed?.transactions ?? [],
    usageEvents: seed?.usageEvents ?? new Map(),
    paymentOrders: seed?.paymentOrders ?? new Map(),
  };
  const lockTails = new Map<string, Promise<void>>();
  let nextTransactionId = 1;

  const acquireUserLock = async (userId: string) => {
    const previous = lockTails.get(userId) ?? Promise.resolve();
    const current = Promise.withResolvers<void>();
    lockTails.set(userId, current.promise);
    await previous;
    return () => {
      current.resolve();
      if (lockTails.get(userId) === current.promise) {
        lockTails.delete(userId);
      }
    };
  };

  const db = {
    async $transaction<T>(
      callback: (transaction: Prisma.TransactionClient) => Promise<T>,
    ) {
      let base = cloneCreditState(state);
      let working = cloneCreditState(state);
      const releases = new Map<string, () => void>();

      const requireLock = (userId: string) => {
        if (!releases.has(userId)) {
          throw new Error(`BALANCE_MUTATION_WITHOUT_LOCK:${userId}`);
        }
      };
      const createTransaction = (
        data: Omit<TransactionRow, "id" | "createdAt">,
      ) => {
        requireLock(data.userId);
        if (
          working.transactions.some(
            (transaction) => transaction.idempotencyKey === data.idempotencyKey,
          )
        ) {
          throw new Error("UNIQUE_CREDIT_TRANSACTION");
        }
        const transaction = {
          ...data,
          id: `transaction-${nextTransactionId++}`,
          createdAt: new Date(),
        };
        working.transactions.push(transaction);
        return transaction;
      };

      const tx = {
        $executeRaw: async (_query: TemplateStringsArray, userId: unknown) => {
          if (typeof userId !== "string") {
            throw new Error("INVALID_LOCK_USER");
          }
          if (!releases.has(userId)) {
            const release = await acquireUserLock(userId);
            releases.set(userId, release);
            base = cloneCreditState(state);
            working = cloneCreditState(state);
          }
          return 1;
        },
        creditWallet: {
          upsert: async (args: {
            where: { userId: string };
            create: { userId: string; balance: number };
          }) => {
            requireLock(args.where.userId);
            const existing = working.wallets.get(args.where.userId);
            if (existing) return existing;
            const now = new Date();
            const wallet = {
              ...args.create,
              createdAt: now,
              updatedAt: now,
            };
            working.wallets.set(wallet.userId, wallet);
            return wallet;
          },
          findUniqueOrThrow: async (args: { where: { userId: string } }) => {
            const wallet = working.wallets.get(args.where.userId);
            if (!wallet) throw new Error("WALLET_NOT_FOUND");
            return wallet;
          },
          updateMany: async (args: {
            where: { userId: string; balance: { gte: number } };
            data: { balance: { decrement: number } };
          }) => {
            requireLock(args.where.userId);
            const wallet = working.wallets.get(args.where.userId);
            if (!wallet || wallet.balance < args.where.balance.gte) {
              return { count: 0 };
            }
            wallet.balance -= args.data.balance.decrement;
            wallet.updatedAt = new Date();
            return { count: 1 };
          },
          update: async (args: {
            where: { userId: string };
            data: { balance: { increment: number } };
          }) => {
            requireLock(args.where.userId);
            const wallet = working.wallets.get(args.where.userId);
            if (!wallet) throw new Error("WALLET_NOT_FOUND");
            wallet.balance += args.data.balance.increment;
            wallet.updatedAt = new Date();
            return wallet;
          },
        },
        creditTransaction: {
          createMany: async (args: {
            data:
              | Omit<TransactionRow, "id" | "createdAt">
              | Array<Omit<TransactionRow, "id" | "createdAt">>;
            skipDuplicates?: boolean;
          }) => {
            const entries = Array.isArray(args.data) ? args.data : [args.data];
            let count = 0;
            for (const entry of entries) {
              const duplicate = working.transactions.some(
                (transaction) =>
                  transaction.idempotencyKey === entry.idempotencyKey,
              );
              if (duplicate && args.skipDuplicates) continue;
              createTransaction(entry);
              count += 1;
            }
            return { count };
          },
          create: async (args: {
            data: Omit<TransactionRow, "id" | "createdAt">;
          }) => createTransaction(args.data),
          findMany: async (args: {
            where: { userId: string };
            orderBy: { createdAt: "desc" };
            take: number;
          }) =>
            working.transactions
              .filter((transaction) => transaction.userId === args.where.userId)
              .sort(
                (left, right) =>
                  right.createdAt.getTime() - left.createdAt.getTime(),
              )
              .slice(0, args.take),
        },
        usageEvent: {
          findUnique: async (args: { where: { generationId: string } }) =>
            working.usageEvents.get(args.where.generationId) ?? null,
          updateMany: async (args: {
            where: {
              generationId: string;
              status: UsageEventRow["status"];
            };
            data: {
              status: UsageEventRow["status"];
              refundedAt: Date;
              reason: string;
            };
          }) => {
            const usageEvent = working.usageEvents.get(args.where.generationId);
            if (!usageEvent || usageEvent.status !== args.where.status) {
              return { count: 0 };
            }
            requireLock(usageEvent.userId);
            usageEvent.status = args.data.status;
            usageEvent.refundedAt = args.data.refundedAt;
            usageEvent.reason = args.data.reason;
            return { count: 1 };
          },
        },
        paymentOrder: {
          findUnique: async (args: { where: { id: string } }) =>
            working.paymentOrders.get(args.where.id) ?? null,
          findUniqueOrThrow: async (args: { where: { id: string } }) => {
            const order = working.paymentOrders.get(args.where.id);
            if (!order) throw new Error("PAYMENT_ORDER_NOT_FOUND");
            return order;
          },
          update: async (args: {
            where: { id: string };
            data: { creditedAt: Date };
          }) => {
            const order = working.paymentOrders.get(args.where.id);
            if (!order) throw new Error("PAYMENT_ORDER_NOT_FOUND");
            requireLock(order.userId);
            order.creditedAt = args.data.creditedAt;
            return order;
          },
        },
      } as unknown as Prisma.TransactionClient;

      try {
        const result = await callback(tx);
        mergeCreditState(state, base, working);
        return result;
      } finally {
        for (const release of releases.values()) release();
      }
    },
  };

  return { db, state };
}

test("creates one signup wallet and grant when initialization is retried", async () => {
  const { db, state } = createCreditHarness();

  await Promise.all([
    db.$transaction((tx) => ensureCreditWallet(tx, "user-1")),
    db.$transaction((tx) => ensureCreditWallet(tx, "user-1")),
  ]);

  assert.equal(state.wallets.get("user-1")?.balance, 10);
  assert.deepEqual(
    state.transactions.map((transaction) => ({
      userId: transaction.userId,
      kind: transaction.kind,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      idempotencyKey: transaction.idempotencyKey,
    })),
    [
      {
        userId: "user-1",
        kind: "SIGNUP_GRANT",
        amount: 10,
        balanceAfter: 10,
        idempotencyKey: "SIGNUP_GRANT:user-1",
      },
    ],
  );
});

test("returns the stored balance and latest 30 transactions by default", async () => {
  const now = new Date();
  const purchases: TransactionRow[] = Array.from(
    { length: 31 },
    (_, index) => ({
      id: `purchase-${index + 1}`,
      userId: "user-1",
      kind: "PURCHASE",
      amount: 1,
      balanceAfter: 11 + index,
      idempotencyKey: `PURCHASE:order-${index + 1}`,
      orderId: `order-${index + 1}`,
      generationId: null,
      reason: null,
      createdAt: new Date(Date.UTC(2026, 0, index + 2)),
    }),
  );
  const { db } = createCreditHarness({
    wallets: new Map([
      [
        "user-1",
        {
          userId: "user-1",
          balance: 42,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
    transactions: [
      {
        id: "signup",
        userId: "user-1",
        kind: "SIGNUP_GRANT",
        amount: 10,
        balanceAfter: 10,
        idempotencyKey: "SIGNUP_GRANT:user-1",
        orderId: null,
        generationId: null,
        reason: null,
        createdAt: new Date(Date.UTC(2026, 0, 1)),
      },
      ...purchases,
    ],
  });

  const snapshot = await getCreditWalletWithDatabase(db, "user-1");

  assert.equal(snapshot.balance, 42);
  assert.equal(snapshot.transactions.length, 30);
  assert.equal(snapshot.transactions[0]?.id, "purchase-31");
  assert.equal(snapshot.transactions[29]?.id, "purchase-2");
});

test("credits one paid order exactly once", async () => {
  const now = new Date();
  const { db, state } = createCreditHarness({
    wallets: new Map([
      [
        "user-1",
        {
          userId: "user-1",
          balance: 10,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
    paymentOrders: new Map([
      [
        "order-1",
        {
          id: "order-1",
          userId: "user-1",
          status: "PAID",
          credits: 20,
          creditedAt: null,
        },
      ],
    ]),
  });

  const balance = await db.$transaction((tx) =>
    creditPaidOrder(tx, { orderId: "order-1" }),
  );
  const duplicateBalance = await db.$transaction((tx) =>
    creditPaidOrder(tx, { orderId: "order-1" }),
  );

  assert.equal(balance, 30);
  assert.equal(duplicateBalance, null);
  assert.equal(state.wallets.get("user-1")?.balance, 30);
  assert.ok(state.paymentOrders.get("order-1")?.creditedAt instanceof Date);
  assert.deepEqual(
    state.transactions.map((transaction) => ({
      kind: transaction.kind,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      orderId: transaction.orderId,
      idempotencyKey: transaction.idempotencyKey,
    })),
    [
      {
        kind: "PURCHASE",
        amount: 20,
        balanceAfter: 30,
        orderId: "order-1",
        idempotencyKey: "PURCHASE:order-1",
      },
    ],
  );
});

test("refuses to credit an order that is not paid", async () => {
  const now = new Date();
  const { db, state } = createCreditHarness({
    wallets: new Map([
      [
        "user-1",
        {
          userId: "user-1",
          balance: 10,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
    paymentOrders: new Map([
      [
        "order-1",
        {
          id: "order-1",
          userId: "user-1",
          status: "PENDING",
          credits: 20,
          creditedAt: null,
        },
      ],
    ]),
  });

  await assert.rejects(
    () => db.$transaction((tx) => creditPaidOrder(tx, { orderId: "order-1" })),
    (error) =>
      error instanceof CreditBalanceError &&
      error.code === "PAYMENT_ORDER_NOT_PAID",
  );
  assert.equal(state.wallets.get("user-1")?.balance, 10);
  assert.equal(state.transactions.length, 0);
  assert.equal(state.paymentOrders.get("order-1")?.creditedAt, null);
});

test("debits only when the wallet has enough credits", async () => {
  const { db, state } = createCreditHarness();
  await db.$transaction((tx) => ensureCreditWallet(tx, "user-1"));

  const balance = await db.$transaction((tx) =>
    debitGenerationCredits(tx, {
      userId: "user-1",
      generationId: "generation-1",
      amount: 4,
    }),
  );

  assert.equal(balance, 6);
  assert.equal(state.wallets.get("user-1")?.balance, 6);
  assert.deepEqual(
    state.transactions.slice(1).map((transaction) => ({
      kind: transaction.kind,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      generationId: transaction.generationId,
    })),
    [
      {
        kind: "GENERATION_DEBIT",
        amount: -4,
        balanceAfter: 6,
        generationId: "generation-1",
      },
    ],
  );

  await assert.rejects(
    () =>
      db.$transaction((tx) =>
        debitGenerationCredits(tx, {
          userId: "user-1",
          generationId: "generation-2",
          amount: 7,
        }),
      ),
    (error) =>
      error instanceof CreditBalanceError &&
      error.code === "INSUFFICIENT_CREDITS",
  );
  assert.equal(state.wallets.get("user-1")?.balance, 6);
  assert.equal(state.transactions.length, 2);
});

test("rejects a non-positive debit before changing the wallet", async () => {
  const { db, state } = createCreditHarness();
  await db.$transaction((tx) => ensureCreditWallet(tx, "user-1"));

  await assert.rejects(
    () =>
      db.$transaction((tx) =>
        debitGenerationCredits(tx, {
          userId: "user-1",
          generationId: "generation-1",
          amount: 0,
        }),
      ),
    (error) =>
      error instanceof CreditBalanceError &&
      error.code === "INVALID_CREDIT_AMOUNT",
  );
  assert.equal(state.wallets.get("user-1")?.balance, 10);
  assert.equal(state.transactions.length, 1);
});

test("refunds a reserved generation exactly once", async () => {
  const now = new Date();
  const { db, state } = createCreditHarness({
    wallets: new Map([
      [
        "user-1",
        {
          userId: "user-1",
          balance: 6,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
    usageEvents: new Map([
      [
        "generation-1",
        {
          userId: "user-1",
          generationId: "generation-1",
          status: "RESERVED",
          creditAmount: 4,
          refundedAt: null,
          reason: null,
        },
      ],
    ]),
  });

  const first = await db.$transaction((tx) =>
    refundReservedGeneration(tx, {
      generationId: "generation-1",
      kind: "TECHNICAL_REFUND",
      reason: "PROVIDER_TIMEOUT",
    }),
  );
  const duplicate = await db.$transaction((tx) =>
    refundReservedGeneration(tx, {
      generationId: "generation-1",
      kind: "TECHNICAL_REFUND",
      reason: "PROVIDER_TIMEOUT",
    }),
  );

  assert.equal(first, true);
  assert.equal(duplicate, false);
  assert.equal(state.wallets.get("user-1")?.balance, 10);
  assert.equal(state.usageEvents.get("generation-1")?.status, "REFUNDED");
  assert.deepEqual(
    state.transactions.map((transaction) => ({
      kind: transaction.kind,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      generationId: transaction.generationId,
      reason: transaction.reason,
    })),
    [
      {
        kind: "TECHNICAL_REFUND",
        amount: 4,
        balanceAfter: 10,
        generationId: "generation-1",
        reason: "PROVIDER_TIMEOUT",
      },
    ],
  );
});

test("rolls back a debit when its journal key was already committed", async () => {
  const { db, state } = createCreditHarness();
  await db.$transaction((tx) => ensureCreditWallet(tx, "user-1"));
  await db.$transaction((tx) =>
    debitGenerationCredits(tx, {
      userId: "user-1",
      generationId: "generation-1",
      amount: 4,
    }),
  );

  await assert.rejects(
    () =>
      db.$transaction((tx) =>
        debitGenerationCredits(tx, {
          userId: "user-1",
          generationId: "generation-1",
          amount: 4,
        }),
      ),
    /UNIQUE_CREDIT_TRANSACTION/,
  );

  assert.equal(state.wallets.get("user-1")?.balance, 6);
  assert.equal(state.transactions.length, 2);
});

test("waits for the same user's advisory lock before crediting an order", async () => {
  const now = new Date();
  const { db, state } = createCreditHarness({
    wallets: new Map([
      [
        "user-1",
        {
          userId: "user-1",
          balance: 10,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
    paymentOrders: new Map([
      [
        "order-1",
        {
          id: "order-1",
          userId: "user-1",
          status: "PAID",
          credits: 20,
          creditedAt: null,
        },
      ],
    ]),
  });
  const lockAcquired = Promise.withResolvers<void>();
  const releaseLock = Promise.withResolvers<void>();
  const blocker = db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"user-1"}, 0))`;
    lockAcquired.resolve();
    await releaseLock.promise;
  });
  await lockAcquired.promise;

  let creditSettled = false;
  const credit = db
    .$transaction((tx) => creditPaidOrder(tx, { orderId: "order-1" }))
    .finally(() => {
      creditSettled = true;
    });

  try {
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(creditSettled, false);
  } finally {
    releaseLock.resolve();
    await blocker;
  }

  assert.equal(await credit, 30);
  assert.equal(state.wallets.get("user-1")?.balance, 30);
  assert.equal(state.transactions.length, 1);
});
