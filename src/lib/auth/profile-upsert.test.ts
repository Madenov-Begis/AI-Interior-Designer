import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.ts";
import { upsertProfileFromAuthUserWithDatabase } from "./profile-upsert.ts";

type ProfileRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BLOCKED";
  planId: string | null;
  timezone: string;
  dailyLimitOverride: number | null;
  maxParallelOverride: number | null;
  vipExpiresAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type WalletRow = {
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
};

type SignupTransactionRow = {
  id: string;
  userId: string;
  kind: "SIGNUP_GRANT";
  amount: number;
  balanceAfter: number;
  idempotencyKey: string;
  orderId: null;
  generationId: null;
  reason: null;
  createdAt: Date;
};

function createProfileHarness() {
  const state = {
    profiles: new Map<string, ProfileRow>(),
    wallets: new Map<string, WalletRow>(),
    transactions: [] as SignupTransactionRow[],
  };
  const allowWalletGrant = Promise.withResolvers<void>();
  let nextTransactionId = 1;

  const db = {
    profile: {
      upsert: async (args: {
        where: { id: string };
        create: {
          id: string;
          email: string;
          firstName: string | null;
          lastName: string | null;
          displayName: string | null;
          avatarUrl: string | null;
          lastLoginAt: Date;
          planId: string;
        };
        update: {
          email: string;
          firstName: string | null;
          lastName: string | null;
          displayName: string | null;
          avatarUrl: string | null;
          lastLoginAt: Date;
          deletedAt: null;
        };
      }) => {
        const existing = state.profiles.get(args.where.id);
        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }
        const now = new Date();
        const profile: ProfileRow = {
          ...args.create,
          role: "USER",
          status: "ACTIVE",
          timezone: "Asia/Tashkent",
          dailyLimitOverride: null,
          maxParallelOverride: null,
          vipExpiresAt: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        state.profiles.set(profile.id, profile);
        return profile;
      },
      update: async (args: {
        where: { id: string };
        data: { planId: string };
      }) => {
        const profile = state.profiles.get(args.where.id);
        if (!profile) throw new Error("PROFILE_NOT_FOUND");
        profile.planId = args.data.planId;
        profile.updatedAt = new Date();
        return profile;
      },
    },
    async $transaction<T>(
      callback: (transaction: Prisma.TransactionClient) => Promise<T>,
    ) {
      const lockedUsers = new Set<string>();
      const tx = {
        $executeRaw: async (_query: TemplateStringsArray, userId: unknown) => {
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
            if (!lockedUsers.has(args.where.userId)) {
              throw new Error("BALANCE_MUTATION_WITHOUT_LOCK");
            }
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
        },
        creditTransaction: {
          createMany: async (args: {
            data: Omit<SignupTransactionRow, "id" | "createdAt">;
            skipDuplicates?: boolean;
          }) => {
            await allowWalletGrant.promise;
            const duplicate = state.transactions.some(
              (transaction) =>
                transaction.idempotencyKey === args.data.idempotencyKey,
            );
            if (duplicate && args.skipDuplicates) return { count: 0 };
            state.transactions.push({
              ...args.data,
              id: `transaction-${nextTransactionId++}`,
              createdAt: new Date(),
            });
            return { count: 1 };
          },
        },
      } as unknown as Prisma.TransactionClient;
      return callback(tx);
    },
  };

  return {
    allowWalletGrant,
    db: db as unknown as PrismaClient,
    state,
  };
}

test("returns the upserted profile only after one signup wallet grant", async () => {
  const { allowWalletGrant, db, state } = createProfileHarness();
  const user = {
    id: "user-1",
    email: "customer@example.com",
    user_metadata: {
      given_name: "Ada",
      family_name: "Lovelace",
    },
  };

  let settled = false;
  const firstUpsert = upsertProfileFromAuthUserWithDatabase(
    db,
    user,
    "free-plan",
  ).finally(() => {
    settled = true;
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(settled, false);

  allowWalletGrant.resolve();
  const profile = await firstUpsert;
  await upsertProfileFromAuthUserWithDatabase(db, user, "free-plan");

  assert.equal(profile.id, "user-1");
  assert.equal(profile.planId, "free-plan");
  assert.equal(profile.displayName, "Ada Lovelace");
  assert.equal(state.wallets.get("user-1")?.balance, 10);
  assert.deepEqual(
    state.transactions.map((transaction) => ({
      kind: transaction.kind,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      idempotencyKey: transaction.idempotencyKey,
    })),
    [
      {
        kind: "SIGNUP_GRANT",
        amount: 10,
        balanceAfter: 10,
        idempotencyKey: "SIGNUP_GRANT:user-1",
      },
    ],
  );
});
