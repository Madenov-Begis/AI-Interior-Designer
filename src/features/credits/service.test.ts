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

function createCreditHarness(seed?: Partial<CreditState>) {
  const state: CreditState = {
    wallets: seed?.wallets ?? new Map(),
    transactions: seed?.transactions ?? [],
    usageEvents: seed?.usageEvents ?? new Map(),
    paymentOrders: seed?.paymentOrders ?? new Map(),
  };
  const lockedUsers = new Set<string>();
  let nextTransactionId = 1;

  const requireLock = (userId: string) => {
    if (!lockedUsers.has(userId)) {
      throw new Error(`BALANCE_MUTATION_WITHOUT_LOCK:${userId}`);
    }
  };

  const createTransaction = (
    data: Omit<TransactionRow, "id" | "createdAt">,
  ) => {
    requireLock(data.userId);
    if (
      state.transactions.some(
        (transaction) =>
          transaction.idempotencyKey === data.idempotencyKey,
      )
    ) {
      throw new Error("UNIQUE_CREDIT_TRANSACTION");
    }
    const transaction = {
      ...data,
      id: `transaction-${nextTransactionId++}`,
      createdAt: new Date(),
    };
    state.transactions.push(transaction);
    return transaction;
  };

  const tx = {
    $executeRaw: async (
      _query: TemplateStringsArray,
      userId: unknown,
    ) => {
      if (typeof userId !== "string") {
        throw new Error("INVALID_LOCK_USER");
      }
      lockedUsers.add(userId);
      return 1;
    },
    creditWallet: {
      upsert: async (args: {
        where: { userId: string };
        create: { userId: string; balance: number };
      }) => {
        requireLock(args.where.userId);
        const existing = state.wallets.get(args.where.userId);
        if (existing) return existing;
        const now = new Date();
        const wallet = {
          ...args.create,
          createdAt: now,
          updatedAt: now,
        };
        state.wallets.set(wallet.userId, wallet);
        return wallet;
      },
      findUniqueOrThrow: async (args: { where: { userId: string } }) => {
        const wallet = state.wallets.get(args.where.userId);
        if (!wallet) throw new Error("WALLET_NOT_FOUND");
        return wallet;
      },
      updateMany: async (args: {
        where: { userId: string; balance: { gte: number } };
        data: { balance: { decrement: number } };
      }) => {
        requireLock(args.where.userId);
        const wallet = state.wallets.get(args.where.userId);
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
        const wallet = state.wallets.get(args.where.userId);
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
          const duplicate = state.transactions.some(
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
        state.transactions
          .filter((transaction) => transaction.userId === args.where.userId)
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
          )
          .slice(0, args.take),
    },
    usageEvent: {
      findUnique: async (args: { where: { generationId: string } }) =>
        state.usageEvents.get(args.where.generationId) ?? null,
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
        const usageEvent = state.usageEvents.get(args.where.generationId);
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
        state.paymentOrders.get(args.where.id) ?? null,
      findUniqueOrThrow: async (args: { where: { id: string } }) => {
        const order = state.paymentOrders.get(args.where.id);
        if (!order) throw new Error("PAYMENT_ORDER_NOT_FOUND");
        return order;
      },
      update: async (args: {
        where: { id: string };
        data: { creditedAt: Date };
      }) => {
        const order = state.paymentOrders.get(args.where.id);
        if (!order) throw new Error("PAYMENT_ORDER_NOT_FOUND");
        requireLock(order.userId);
        order.creditedAt = args.data.creditedAt;
        return order;
      },
    },
  } as unknown as Prisma.TransactionClient;

  const db = {
    async $transaction<T>(
      callback: (transaction: Prisma.TransactionClient) => Promise<T>,
    ) {
      lockedUsers.clear();
      return callback(tx);
    },
  };

  return {
    db,
    resetLocks: () => lockedUsers.clear(),
    state,
    tx,
  };
}

test("creates one signup wallet and grant when initialization is retried", async () => {
  const { resetLocks, state, tx } = createCreditHarness();

  await ensureCreditWallet(tx, "user-1");
  resetLocks();
  await ensureCreditWallet(tx, "user-1");

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
  const { state, tx } = createCreditHarness({
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

  const balance = await creditPaidOrder(tx, { orderId: "order-1" });
  const duplicateBalance = await creditPaidOrder(tx, {
    orderId: "order-1",
  });

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
  const { state, tx } = createCreditHarness({
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
    () => creditPaidOrder(tx, { orderId: "order-1" }),
    (error) =>
      error instanceof CreditBalanceError &&
      error.code === "PAYMENT_ORDER_NOT_PAID",
  );
  assert.equal(state.wallets.get("user-1")?.balance, 10);
  assert.equal(state.transactions.length, 0);
  assert.equal(state.paymentOrders.get("order-1")?.creditedAt, null);
});

test("debits only when the wallet has enough credits", async () => {
  const { resetLocks, state, tx } = createCreditHarness();
  await ensureCreditWallet(tx, "user-1");
  resetLocks();

  const balance = await debitGenerationCredits(tx, {
    userId: "user-1",
    generationId: "generation-1",
    amount: 4,
  });

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

  resetLocks();
  await assert.rejects(
    () =>
      debitGenerationCredits(tx, {
        userId: "user-1",
        generationId: "generation-2",
        amount: 7,
      }),
    (error) =>
      error instanceof CreditBalanceError &&
      error.code === "INSUFFICIENT_CREDITS",
  );
  assert.equal(state.wallets.get("user-1")?.balance, 6);
  assert.equal(state.transactions.length, 2);
});

test("rejects a non-positive debit before changing the wallet", async () => {
  const { state, tx } = createCreditHarness();
  await ensureCreditWallet(tx, "user-1");

  await assert.rejects(
    () =>
      debitGenerationCredits(tx, {
        userId: "user-1",
        generationId: "generation-1",
        amount: 0,
      }),
    (error) =>
      error instanceof CreditBalanceError &&
      error.code === "INVALID_CREDIT_AMOUNT",
  );
  assert.equal(state.wallets.get("user-1")?.balance, 10);
  assert.equal(state.transactions.length, 1);
});

test("refunds a reserved generation exactly once", async () => {
  const now = new Date();
  const { state, tx } = createCreditHarness({
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

  const first = await refundReservedGeneration(tx, {
    generationId: "generation-1",
    kind: "TECHNICAL_REFUND",
    reason: "PROVIDER_TIMEOUT",
  });
  const duplicate = await refundReservedGeneration(tx, {
    generationId: "generation-1",
    kind: "TECHNICAL_REFUND",
    reason: "PROVIDER_TIMEOUT",
  });

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
