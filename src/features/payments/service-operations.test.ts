import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../../generated/prisma/client.ts";
import { MockPaymentProvider } from "./provider.ts";
import {
  applyPaymentEventWithDatabase,
  assertMockPaymentAccess,
  createPaymentOrderWithDependencies,
  getOwnedPaymentOrderWithDatabase,
  type PaymentDatabase,
  PaymentServiceError,
} from "./service-operations.ts";

type OrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
type OrderRow = {
  id: string;
  userId: string;
  provider: "MOCK" | "PAYME" | "CLICK";
  providerOrderId: string | null;
  status: OrderStatus;
  packageCode: string;
  packageName: string;
  credits: number;
  amountUzs: number;
  expiresAt: Date;
  paidAt: Date | null;
  creditedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type EventRow = {
  orderId: string;
  provider: "MOCK" | "PAYME" | "CLICK";
  providerEventId: string;
  outcome: OrderStatus;
  createdAt: Date;
};
type HarnessState = {
  orders: Map<string, OrderRow>;
  events: EventRow[];
  wallets: Map<string, number>;
  transactions: Array<{
    orderId: string;
    amount: number;
    balanceAfter: number;
    idempotencyKey: string;
  }>;
};

function cloneState(state: HarnessState): HarnessState {
  return {
    orders: new Map(
      [...state.orders].map(([id, order]) => [
        id,
        {
          ...order,
          expiresAt: new Date(order.expiresAt),
          paidAt: order.paidAt ? new Date(order.paidAt) : null,
          creditedAt: order.creditedAt ? new Date(order.creditedAt) : null,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
        },
      ]),
    ),
    events: state.events.map((event) => ({
      ...event,
      createdAt: new Date(event.createdAt),
    })),
    wallets: new Map(state.wallets),
    transactions: state.transactions.map((transaction) => ({
      ...transaction,
    })),
  };
}

function replaceState(target: HarnessState, source: HarnessState) {
  target.orders = source.orders;
  target.events = source.events;
  target.wallets = source.wallets;
  target.transactions = source.transactions;
}

function createPaymentHarness(seed?: Partial<HarnessState>) {
  const state: HarnessState = {
    orders: seed?.orders ?? new Map(),
    events: seed?.events ?? [],
    wallets: seed?.wallets ?? new Map(),
    transactions: seed?.transactions ?? [],
  };
  let nextOrder = state.orders.size + 1;
  const orderLockQueries: string[] = [];

  function paymentOrderClient(active: HarnessState) {
    return {
      create: async (args: {
        data: Omit<
          OrderRow,
          | "id"
          | "providerOrderId"
          | "paidAt"
          | "creditedAt"
          | "createdAt"
          | "updatedAt"
        >;
      }) => {
        const now = new Date();
        const order: OrderRow = {
          ...args.data,
          id: `order-${nextOrder++}`,
          providerOrderId: null,
          paidAt: null,
          creditedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        active.orders.set(order.id, order);
        return order;
      },
      findFirst: async (args: { where: { id: string; userId: string } }) => {
        const order = active.orders.get(args.where.id);
        return order?.userId === args.where.userId ? order : null;
      },
      findUnique: async (args: { where: { id: string } }) =>
        active.orders.get(args.where.id) ?? null,
      findUniqueOrThrow: async (args: { where: { id: string } }) => {
        const order = active.orders.get(args.where.id);
        if (!order) throw new Error("ORDER_NOT_FOUND");
        return order;
      },
      update: async (args: {
        where: { id: string };
        data: Partial<OrderRow> & {
          balance?: never;
        };
      }) => {
        const order = active.orders.get(args.where.id);
        if (!order) throw new Error("ORDER_NOT_FOUND");
        Object.assign(order, args.data, { updatedAt: new Date() });
        return order;
      },
      updateMany: async (args: {
        where: {
          id: string;
          userId?: string;
          status?: OrderStatus;
          expiresAt?: { lte: Date };
        };
        data: Partial<OrderRow>;
      }) => {
        const order = active.orders.get(args.where.id);
        if (
          !order ||
          (args.where.userId && order.userId !== args.where.userId) ||
          (args.where.status && order.status !== args.where.status) ||
          (args.where.expiresAt && order.expiresAt > args.where.expiresAt.lte)
        ) {
          return { count: 0 };
        }
        Object.assign(order, args.data, { updatedAt: new Date() });
        return { count: 1 };
      },
    };
  }

  const db = {
    paymentOrder: paymentOrderClient(state),
    async $transaction<T>(
      callback: (tx: Prisma.TransactionClient) => Promise<T>,
    ) {
      const before = cloneState(state);
      const tx = {
        $executeRaw: async () => 1,
        $queryRaw: async (query: TemplateStringsArray, orderId: unknown) => {
          orderLockQueries.push(query.join("$orderId"));
          if (typeof orderId !== "string") return [];
          const order = state.orders.get(orderId);
          return order ? [order] : [];
        },
        paymentOrder: paymentOrderClient(state),
        paymentEvent: {
          createMany: async (args: {
            data: EventRow;
            skipDuplicates: boolean;
          }) => {
            const duplicate = state.events.some(
              (event) =>
                event.provider === args.data.provider &&
                event.providerEventId === args.data.providerEventId,
            );
            if (duplicate && args.skipDuplicates) return { count: 0 };
            state.events.push({ ...args.data });
            return { count: 1 };
          },
          findUnique: async (args: {
            where: {
              provider_providerEventId: {
                provider: EventRow["provider"];
                providerEventId: string;
              };
            };
          }) =>
            state.events.find(
              (event) =>
                event.provider ===
                  args.where.provider_providerEventId.provider &&
                event.providerEventId ===
                  args.where.provider_providerEventId.providerEventId,
            ) ?? null,
        },
        creditWallet: {
          update: async (args: {
            where: { userId: string };
            data: { balance: { increment: number } };
          }) => {
            const current = state.wallets.get(args.where.userId);
            if (current === undefined) throw new Error("WALLET_NOT_FOUND");
            const balance = current + args.data.balance.increment;
            state.wallets.set(args.where.userId, balance);
            return { userId: args.where.userId, balance };
          },
          findUnique: async (args: { where: { userId: string } }) => {
            const balance = state.wallets.get(args.where.userId);
            return balance === undefined
              ? null
              : { userId: args.where.userId, balance };
          },
        },
        creditTransaction: {
          create: async (args: {
            data: {
              orderId: string;
              amount: number;
              balanceAfter: number;
              idempotencyKey: string;
            };
          }) => {
            if (
              state.transactions.some(
                (item) => item.idempotencyKey === args.data.idempotencyKey,
              )
            ) {
              throw new Error("UNIQUE_CREDIT_TRANSACTION");
            }
            state.transactions.push({
              orderId: args.data.orderId,
              amount: args.data.amount,
              balanceAfter: args.data.balanceAfter,
              idempotencyKey: args.data.idempotencyKey,
            });
            return args.data;
          },
        },
      } as unknown as Prisma.TransactionClient;

      try {
        return await callback(tx);
      } catch (error) {
        replaceState(state, before);
        throw error;
      }
    },
  };
  return {
    db: db as unknown as PaymentDatabase,
    state,
    orderLockQueries,
  };
}

function seedOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  const now = new Date("2026-07-29T10:00:00.000Z");
  return {
    id: "order-1",
    userId: "user-1",
    provider: "MOCK",
    providerOrderId: "mock-order-1",
    status: "PENDING",
    packageCode: "standard",
    packageName: "Стандарт",
    credits: 60,
    amountUzs: 69_000,
    expiresAt: new Date("2026-07-29T10:30:00.000Z"),
    paidAt: null,
    creditedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const packageResolver = (code: string) =>
  code === "standard"
    ? {
        code: "standard",
        name: "Стандарт",
        credits: 60,
        priceUzs: 69_000,
        popular: true,
      }
    : null;

test("creates a 30-minute order from the server-owned package snapshot", async () => {
  const { db, state } = createPaymentHarness();
  const now = new Date("2026-07-29T10:00:00.000Z");

  const result = await createPaymentOrderWithDependencies(
    {
      db,
      provider: new MockPaymentProvider(),
      paymentMode: "mock",
      getPackage: packageResolver,
      now: () => now,
    },
    "user-1",
    "standard",
  );

  assert.deepEqual(
    {
      packageCode: result.order.packageCode,
      packageName: result.order.packageName,
      credits: result.order.credits,
      amountUzs: result.order.amountUzs,
      status: result.order.status,
      expiresAt: result.order.expiresAt,
      providerOrderId: result.order.providerOrderId,
    },
    {
      packageCode: "standard",
      packageName: "Стандарт",
      credits: 60,
      amountUzs: 69_000,
      status: "PENDING",
      expiresAt: new Date("2026-07-29T10:30:00.000Z"),
      providerOrderId: "mock-order-1",
    },
  );
  assert.equal(result.checkoutUrl, "/app/credits/checkout/order-1");
  assert.equal(state.orders.size, 1);
});

test("rejects disabled payments and unknown package codes before creating an order", async () => {
  const { db, state } = createPaymentHarness();
  const dependencies = {
    db,
    provider: new MockPaymentProvider(),
    getPackage: packageResolver,
    now: () => new Date("2026-07-29T10:00:00.000Z"),
  };

  await assert.rejects(
    () =>
      createPaymentOrderWithDependencies(
        { ...dependencies, paymentMode: "disabled" },
        "user-1",
        "standard",
      ),
    (error) =>
      error instanceof PaymentServiceError &&
      error.code === "PAYMENTS_DISABLED",
  );
  await assert.rejects(
    () =>
      createPaymentOrderWithDependencies(
        { ...dependencies, paymentMode: "mock" },
        "user-1",
        "unknown",
      ),
    (error) =>
      error instanceof PaymentServiceError &&
      error.code === "CREDIT_PACKAGE_NOT_FOUND",
  );
  assert.equal(state.orders.size, 0);
});

test("returns only an owned order and expires it at the boundary instant", async () => {
  const order = seedOrder();
  const { db, state } = createPaymentHarness({
    orders: new Map([[order.id, order]]),
  });

  await assert.rejects(
    () =>
      getOwnedPaymentOrderWithDatabase(db, "user-2", order.id, order.expiresAt),
    (error) =>
      error instanceof PaymentServiceError &&
      error.code === "PAYMENT_ORDER_NOT_FOUND",
  );
  const owned = await getOwnedPaymentOrderWithDatabase(
    db,
    "user-1",
    order.id,
    order.expiresAt,
  );

  assert.equal(owned.status, "EXPIRED");
  assert.equal(state.orders.get(order.id)?.status, "EXPIRED");
});

for (const outcome of ["FAILED", "CANCELLED"] as const) {
  test(`applies ${outcome.toLowerCase()} without crediting the wallet`, async () => {
    const order = seedOrder();
    const { db, state } = createPaymentHarness({
      orders: new Map([[order.id, order]]),
      wallets: new Map([["user-1", 10]]),
    });

    const result = await applyPaymentEventWithDatabase(
      db,
      {
        provider: "MOCK",
        providerEventId: `event-${outcome}`,
        orderId: order.id,
        outcome,
        occurredAt: new Date("2026-07-29T10:05:00.000Z"),
      },
      new Date("2026-07-29T10:05:00.000Z"),
    );

    assert.equal(result.order.status, outcome);
    assert.equal(result.balance, null);
    assert.equal(state.wallets.get("user-1"), 10);
    assert.equal(state.transactions.length, 0);
  });
}

test("a paid event credits the snapshotted credits exactly once", async () => {
  const order = seedOrder();
  const { db, state } = createPaymentHarness({
    orders: new Map([[order.id, order]]),
    wallets: new Map([["user-1", 10]]),
  });
  const event = {
    provider: "MOCK" as const,
    providerEventId: "event-paid",
    orderId: order.id,
    outcome: "PAID" as const,
    occurredAt: new Date("2026-07-29T10:05:00.000Z"),
  };

  const first = await applyPaymentEventWithDatabase(
    db,
    event,
    event.occurredAt,
  );
  const duplicate = await applyPaymentEventWithDatabase(
    db,
    event,
    event.occurredAt,
  );

  assert.equal(first.order.status, "PAID");
  assert.equal(first.balance, 70);
  assert.equal(duplicate.order.status, "PAID");
  assert.equal(duplicate.balance, 70);
  assert.equal(state.events.length, 1);
  assert.equal(state.wallets.get("user-1"), 70);
  assert.deepEqual(state.transactions, [
    {
      orderId: "order-1",
      amount: 60,
      balanceAfter: 70,
      idempotencyKey: "PURCHASE:order-1",
    },
  ]);
  assert.ok(state.orders.get(order.id)?.creditedAt instanceof Date);
});

test("payment events use a parent-row lock compatible with the event foreign-key key-share lock", async () => {
  const order = seedOrder();
  const { db, orderLockQueries } = createPaymentHarness({
    orders: new Map([[order.id, order]]),
    wallets: new Map([["user-1", 10]]),
  });

  await applyPaymentEventWithDatabase(
    db,
    {
      provider: "MOCK",
      providerEventId: "event-lock-contract",
      orderId: order.id,
      outcome: "FAILED",
      occurredAt: new Date("2026-07-29T10:05:00.000Z"),
    },
    new Date("2026-07-29T10:05:00.000Z"),
  );

  assert.equal(orderLockQueries.length, 1);
  assert.match(orderLockQueries[0] ?? "", /FOR NO KEY UPDATE/i);
  assert.doesNotMatch(orderLockQueries[0] ?? "", /\bFOR UPDATE\b/i);
});

test("an expired pending order is persisted as expired and rejects a late outcome", async () => {
  const order = seedOrder({
    expiresAt: new Date("2026-07-29T10:00:00.000Z"),
  });
  const { db, state } = createPaymentHarness({
    orders: new Map([[order.id, order]]),
    wallets: new Map([["user-1", 10]]),
  });

  await assert.rejects(
    () =>
      applyPaymentEventWithDatabase(
        db,
        {
          provider: "MOCK",
          providerEventId: "event-late-paid",
          orderId: order.id,
          outcome: "PAID",
          occurredAt: new Date("2026-07-29T10:01:00.000Z"),
        },
        new Date("2026-07-29T10:01:00.000Z"),
      ),
    (error) =>
      error instanceof PaymentServiceError &&
      error.code === "PAYMENT_ORDER_EXPIRED",
  );
  await assert.rejects(
    () =>
      applyPaymentEventWithDatabase(
        db,
        {
          provider: "MOCK",
          providerEventId: "event-late-paid",
          orderId: order.id,
          outcome: "PAID",
          occurredAt: new Date("2026-07-29T10:01:00.000Z"),
        },
        new Date("2026-07-29T10:01:00.000Z"),
      ),
    (error) =>
      error instanceof PaymentServiceError &&
      error.code === "PAYMENT_ORDER_EXPIRED",
  );

  assert.equal(state.orders.get(order.id)?.status, "EXPIRED");
  assert.equal(state.wallets.get("user-1"), 10);
  assert.equal(state.transactions.length, 0);
});

test("an explicit provider expiration event completes the expiration transition", async () => {
  const order = seedOrder({
    expiresAt: new Date("2026-07-29T10:00:00.000Z"),
  });
  const { db, state } = createPaymentHarness({
    orders: new Map([[order.id, order]]),
    wallets: new Map([["user-1", 10]]),
  });

  const result = await applyPaymentEventWithDatabase(
    db,
    {
      provider: "MOCK",
      providerEventId: "event-expired",
      orderId: order.id,
      outcome: "EXPIRED",
      occurredAt: new Date("2026-07-29T10:01:00.000Z"),
    },
    new Date("2026-07-29T10:01:00.000Z"),
  );

  assert.equal(result.order.status, "EXPIRED");
  assert.equal(result.balance, null);
  assert.equal(state.events.length, 1);
});

test("rejects a provider mismatch and a second terminal transition", async () => {
  const order = seedOrder();
  const { db, state } = createPaymentHarness({
    orders: new Map([[order.id, order]]),
    wallets: new Map([["user-1", 10]]),
  });

  await assert.rejects(
    () =>
      applyPaymentEventWithDatabase(
        db,
        {
          provider: "CLICK",
          providerEventId: "event-wrong-provider",
          orderId: order.id,
          outcome: "FAILED",
          occurredAt: new Date("2026-07-29T10:01:00.000Z"),
        },
        new Date("2026-07-29T10:01:00.000Z"),
      ),
    (error) =>
      error instanceof PaymentServiceError &&
      error.code === "PAYMENT_EVENT_MISMATCH",
  );

  state.orders.get(order.id)!.status = "CANCELLED";
  await assert.rejects(
    () =>
      applyPaymentEventWithDatabase(
        db,
        {
          provider: "MOCK",
          providerEventId: "event-after-cancel",
          orderId: order.id,
          outcome: "PAID",
          occurredAt: new Date("2026-07-29T10:02:00.000Z"),
        },
        new Date("2026-07-29T10:02:00.000Z"),
      ),
    (error) =>
      error instanceof PaymentServiceError &&
      error.code === "INVALID_PAYMENT_TRANSITION",
  );
  assert.equal(state.events.length, 0);
});

test("mock outcomes are allowed only for the safe fake-development configuration", () => {
  assert.doesNotThrow(() =>
    assertMockPaymentAccess({
      nodeEnv: "development",
      aiProvider: "fake",
      paymentProvider: "mock",
    }),
  );
  for (const configuration of [
    {
      nodeEnv: "development",
      aiProvider: "fake",
      paymentProvider: "disabled",
    },
    {
      nodeEnv: "production",
      aiProvider: "fake",
      paymentProvider: "mock",
    },
    {
      nodeEnv: "development",
      aiProvider: "vertex",
      paymentProvider: "mock",
    },
  ]) {
    assert.throws(
      () => assertMockPaymentAccess(configuration),
      (error) =>
        error instanceof PaymentServiceError &&
        error.code === "MOCK_PAYMENTS_NOT_SAFE",
    );
  }
});
