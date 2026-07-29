# UZS Credit Wallet and Mock Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Renoa's presentational credits and daily quota gate with a transactional wallet, three UZS packages, and a safely constrained mock checkout.

**Architecture:** PostgreSQL stores a balance projection plus an immutable credit journal, payment-order snapshots, and idempotent payment events. Generation reservation debits four credits inside the existing per-user transaction; worker failure and queued cancellation refund the recorded amount. UI and API consume provider-independent services, while `MockPaymentProvider` is the only first-release checkout adapter.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, TanStack Query, Prisma 7, PostgreSQL/Supabase, Zod 4, Node test runner, Tailwind CSS.

## Global Constraints

- New and existing users receive exactly 10 signup credits once.
- A root generation, retry, variation, or refinement costs exactly 4 credits.
- Purchased credits never expire.
- Packages are `mini` (20 credits / 25,000 UZS), `standard` (60 / 69,000 UZS), and `pro` (160 / 169,000 UZS).
- Prices and credit quantities are resolved only from server-owned configuration and snapshotted on orders.
- The provider-cost snapshot is USD 0.1472 per Vertex generation; the internal UZS budget is 2,100 per successful generation.
- Mock payment success is forbidden in production and whenever `AI_PROVIDER=vertex`.
- A technical failure or queued cancellation refunds exactly the `UsageEvent.creditAmount`; a request already processing does not receive a cancellation refund.
- Database uniqueness constraints, not route timing, are the final idempotency defense.
- Subscriptions, automatic renewal, promo codes, cash refunds, receipts, invoices, admin balance UI, and real Payme/Click endpoints remain out of scope.

---

## File Structure

### Create

- `src/features/credits/policy.ts` — pure balance and journal rules.
- `src/features/credits/policy.test.ts` — unit tests for credit arithmetic and idempotency keys.
- `src/features/credits/service.ts` — transactional wallet reads, debits, credits, and refunds.
- `src/features/payments/policy.ts` — payment state machine and safe mock-mode rules.
- `src/features/payments/policy.test.ts` — state and environment tests.
- `src/features/payments/schema.ts` — package/order/mock-outcome input validation.
- `src/features/payments/provider.ts` — checkout-provider contract and mock adapter.
- `src/features/payments/service.ts` — order creation, owned-order reads, and idempotent event application.
- `src/app/api/v1/credits/route.ts` — owned wallet, packages, and recent journal.
- `src/app/api/v1/payment-orders/route.ts` — create a snapshotted order.
- `src/app/api/v1/payment-orders/[id]/route.ts` — read an owned order.
- `src/app/api/v1/payment-orders/[id]/mock-outcome/route.ts` — safe mock outcome.
- `src/app/app/(dashboard)/credits/checkout/[id]/page.tsx` — mock checkout page.
- `src/components/credits/mock-checkout.tsx` — mock outcome controls.
- `prisma/migrations/20260729000000_add_credit_wallet_and_mock_payments/migration.sql` — schema, backfill, RLS, and seed cost.

### Modify

- `prisma/schema.prisma` — wallet, journal, orders, events, relations, and `creditAmount`.
- `src/config/product.ts` and `src/config/product.test.ts` — UZS packages and economic constants.
- `src/config/env.ts` and `.env.example` — explicit payment mode and safety validation.
- `src/lib/auth/current-user.ts` — exactly-once wallet creation.
- `src/features/plans/defaults.ts` — model cost defaults.
- `src/features/generations/reservation.ts` — credit debit and cost snapshot.
- `src/features/generations/reservation-policy.ts` and `.test.ts` — insufficient-credit rule.
- `src/features/generations/worker.ts` — technical refund through wallet service.
- `src/features/generations/service.ts` — queued cancellation refund.
- Generation and refinement route files — `INSUFFICIENT_CREDITS` mapping.
- `src/app/app/(dashboard)/layout.tsx` — real top-bar balance.
- `src/app/api/v1/profile/route.ts` — wallet summary.
- `src/components/profile/profile-panel.tsx` — replace daily quota presentation with credits.
- `src/components/credits/credits-grid.tsx` — live packages, balance, history, and order creation.
- `src/app/app/(dashboard)/credits/page.tsx` — live purchase page copy.
- `src/components/design/design-inspector.tsx` — wallet-aware generation action.
- `src/components/design/design-workspace.tsx` — wallet query and invalidation.
- `src/components/design/generation-refinement-composer.tsx` — four-credit price and insufficient-balance state.
- `package.json` — register all new Node tests.

---

### Task 1: Product Configuration and Pure Policies

**Files:**
- Modify: `src/config/product.ts`
- Modify: `src/config/product.test.ts`
- Create: `src/features/credits/policy.ts`
- Create: `src/features/credits/policy.test.ts`
- Create: `src/features/payments/policy.ts`
- Create: `src/features/payments/policy.test.ts`
- Modify: `src/config/env.ts`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Produces: `SIGNUP_CREDIT_GRANT`, `GENERATION_CREDIT_COST`, `VERTEX_GENERATION_COST_USD`, `GENERATION_BUDGET_UZS`, `CREDIT_PACKAGES`, `getCreditPackage(code)`.
- Produces: `canDebit(balance, amount)`, `balanceAfter(balance, signedAmount)`,
  `creditTransactionKey(kind, entityId)`, and `applyCreditMovement(state,
  movement)`.
- Produces: `canTransitionPayment(from, to)`,
  `snapshotCreditPackage(package)`, and
  `assertSafePaymentConfiguration(input)`.

- [ ] **Step 1: Write failing product and credit-policy tests**

Add exact assertions:

```ts
test("defines the approved UZS launch packages", () => {
  assert.deepEqual(
    CREDIT_PACKAGES.map(({ code, credits, priceUzs }) => ({
      code,
      credits,
      priceUzs,
    })),
    [
      { code: "mini", credits: 20, priceUzs: 25_000 },
      { code: "standard", credits: 60, priceUzs: 69_000 },
      { code: "pro", credits: 160, priceUzs: 169_000 },
    ],
  );
  assert.equal(SIGNUP_CREDIT_GRANT, 10);
  assert.equal(GENERATION_CREDIT_COST, 4);
  assert.equal(VERTEX_GENERATION_COST_USD, 0.1472);
  assert.equal(GENERATION_BUDGET_UZS, 2_100);
});

test("never permits a negative projected balance", () => {
  assert.equal(canDebit(4, 4), true);
  assert.equal(canDebit(3, 4), false);
  assert.equal(balanceAfter(4, -4), 0);
  assert.throws(() => balanceAfter(3, -4), /INSUFFICIENT_CREDITS/);
});

test("builds stable entity-scoped transaction keys", () => {
  assert.equal(
    creditTransactionKey("GENERATION_DEBIT", "generation-id"),
    "GENERATION_DEBIT:generation-id",
  );
});

test("applies one balance movement idempotently", () => {
  const first = applyCreditMovement(
    { balance: 10, appliedKeys: new Set<string>() },
    { idempotencyKey: "GENERATION_DEBIT:g1", amount: -4 },
  );
  const duplicate = applyCreditMovement(first, {
    idempotencyKey: "GENERATION_DEBIT:g1",
    amount: -4,
  });
  assert.equal(first.balance, 6);
  assert.equal(duplicate.balance, 6);
});
```

- [ ] **Step 2: Write failing payment-policy tests**

```ts
test("accepts only transitions out of PENDING", () => {
  assert.equal(canTransitionPayment("PENDING", "PAID"), true);
  assert.equal(canTransitionPayment("PENDING", "FAILED"), true);
  assert.equal(canTransitionPayment("PENDING", "CANCELLED"), true);
  assert.equal(canTransitionPayment("PENDING", "EXPIRED"), true);
  assert.equal(canTransitionPayment("PAID", "FAILED"), false);
  assert.equal(canTransitionPayment("FAILED", "PAID"), false);
});

test("rejects unsafe mock payment configurations", () => {
  assert.throws(
    () => assertSafePaymentConfiguration({
      nodeEnv: "production",
      aiProvider: "fake",
      paymentProvider: "mock",
    }),
    /MOCK_PAYMENTS_NOT_SAFE/,
  );
  assert.throws(
    () => assertSafePaymentConfiguration({
      nodeEnv: "development",
      aiProvider: "vertex",
      paymentProvider: "mock",
    }),
    /MOCK_PAYMENTS_NOT_SAFE/,
  );
});

test("keeps an immutable order snapshot when package config changes", () => {
  const source = { code: "mini", name: "Мини", credits: 20, priceUzs: 25_000 };
  const snapshot = snapshotCreditPackage(source);
  source.credits = 999;
  source.priceUzs = 1;
  assert.deepEqual(snapshot, {
    packageCode: "mini",
    packageName: "Мини",
    credits: 20,
    amountUzs: 25_000,
  });
});
```

- [ ] **Step 3: Run the focused tests and verify failure**

Run:

```bash
node --test --experimental-strip-types \
  src/config/product.test.ts \
  src/features/credits/policy.test.ts \
  src/features/payments/policy.test.ts
```

Expected: FAIL because the approved constants and policy modules do not exist.

- [ ] **Step 4: Implement the approved product configuration**

Use:

```ts
export const SIGNUP_CREDIT_GRANT = 10;
export const GENERATION_CREDIT_COST = 4;
export const VERTEX_GENERATION_COST_USD = 0.1472;
export const GENERATION_BUDGET_UZS = 2_100;

export const CREDIT_PACKAGES = [
  { code: "mini", name: "Мини", credits: 20, priceUzs: 25_000, popular: false },
  { code: "standard", name: "Стандарт", credits: 60, priceUzs: 69_000, popular: true },
  { code: "pro", name: "Про", credits: 160, priceUzs: 169_000, popular: false },
] as const;

export type CreditPackageCode = (typeof CREDIT_PACKAGES)[number]["code"];

export function getCreditPackage(code: string) {
  return CREDIT_PACKAGES.find((item) => item.code === code) ?? null;
}
```

Keep `GENERATION_REFUND_MESSAGE` and `APP_NAV_ITEMS`.

- [ ] **Step 5: Implement pure credit and payment policies**

`policy.ts` must reject non-integers, non-positive debit amounts, and negative
projected balances. Payment transitions must use a literal transition map:

```ts
const ALLOWED_PAYMENT_TRANSITIONS = {
  PENDING: new Set(["PAID", "FAILED", "CANCELLED", "EXPIRED"]),
  PAID: new Set<string>(),
  FAILED: new Set<string>(),
  CANCELLED: new Set<string>(),
  EXPIRED: new Set<string>(),
} as const;
```

`applyCreditMovement` clones the `Set`, returns the original balance for an
already-applied key, and otherwise calls `balanceAfter` before recording the
key. `snapshotCreditPackage` returns a new object with only `packageCode`,
`packageName`, `credits`, and `amountUzs`; `createPaymentOrder` must consume
this helper rather than spread the live package object.

`assertSafePaymentConfiguration` allows `paymentProvider: "disabled"` in every
environment and allows `"mock"` only when `nodeEnv !== "production"` and
`aiProvider === "fake"`.

- [ ] **Step 6: Add payment mode to validated environment**

Extend `serverEnvSchema` with:

```ts
PAYMENT_PROVIDER: z.enum(["disabled", "mock"]).default("disabled"),
```

Call `assertSafePaymentConfiguration` from `superRefine`, converting a thrown
error into a Zod custom issue on `PAYMENT_PROVIDER`. Add
`PAYMENT_PROVIDER=disabled` to `.env.example`.

- [ ] **Step 7: Register and run tests**

Add the two new test files to the `test` script, then run:

```bash
pnpm test
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/config/product.ts src/config/product.test.ts src/config/env.ts \
  src/features/credits/policy.ts src/features/credits/policy.test.ts \
  src/features/payments/policy.ts src/features/payments/policy.test.ts \
  .env.example package.json
git commit -m "feat: define UZS credit and payment policies"
```

---

### Task 2: Prisma Wallet, Journal, and Payment Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260729000000_add_credit_wallet_and_mock_payments/migration.sql`
- Modify: `src/features/plans/defaults.ts`

**Interfaces:**
- Produces: `CreditWallet`, `CreditTransaction`, `PaymentOrder`, and `PaymentEvent`.
- Extends: `UsageEvent.creditAmount: Int`.
- Keeps: `Generation.estimatedCost` and `AiModel.costPerGeneration` as USD decimals.

- [ ] **Step 1: Add Prisma enums and models**

Add:

```prisma
enum CreditTransactionKind {
  SIGNUP_GRANT
  PURCHASE
  GENERATION_DEBIT
  TECHNICAL_REFUND
  CANCELLATION_REFUND
  ADMIN_ADJUSTMENT
}

enum PaymentProvider {
  MOCK
  PAYME
  CLICK
}

enum PaymentOrderStatus {
  PENDING
  PAID
  FAILED
  CANCELLED
  EXPIRED
}

model CreditWallet {
  userId    String   @id @db.Uuid
  balance   Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user         Profile             @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions CreditTransaction[]
}

model CreditTransaction {
  id             String                @id @default(uuid()) @db.Uuid
  userId         String                @db.Uuid
  kind           CreditTransactionKind
  amount         Int
  balanceAfter   Int
  idempotencyKey String                @unique
  orderId        String?               @db.Uuid
  generationId   String?               @db.Uuid
  reason         String?
  createdAt      DateTime              @default(now())

  wallet     CreditWallet  @relation(fields: [userId], references: [userId], onDelete: Cascade)
  order      PaymentOrder? @relation(fields: [orderId], references: [id])
  generation Generation?   @relation(fields: [generationId], references: [id])

  @@index([userId, createdAt])
  @@index([orderId])
  @@index([generationId])
}

model PaymentOrder {
  id               String             @id @default(uuid()) @db.Uuid
  userId           String             @db.Uuid
  provider         PaymentProvider
  providerOrderId  String?
  status           PaymentOrderStatus @default(PENDING)
  packageCode      String
  packageName      String
  credits          Int
  amountUzs        Int
  expiresAt        DateTime
  paidAt           DateTime?
  creditedAt       DateTime?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  user         Profile             @relation(fields: [userId], references: [id], onDelete: Restrict)
  transactions CreditTransaction[]
  events       PaymentEvent[]

  @@unique([provider, providerOrderId])
  @@index([userId, createdAt])
  @@index([status, expiresAt])
}

model PaymentEvent {
  id              String             @id @default(uuid()) @db.Uuid
  orderId         String             @db.Uuid
  provider        PaymentProvider
  providerEventId String
  outcome         PaymentOrderStatus
  createdAt       DateTime           @default(now())

  order PaymentOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([provider, providerEventId])
  @@index([orderId, createdAt])
}
```

Add these exact relations:

```prisma
// Profile
creditWallet  CreditWallet?
paymentOrders PaymentOrder[]

// Generation
creditTransactions CreditTransaction[]
```

Add
`creditAmount Int @default(0)` to `UsageEvent`; new application writes always
set it to four, while legacy rows remain zero.

- [ ] **Step 2: Write the SQL migration**

The migration must:

1. Create all three enums and four tables with the same constraints as Prisma.
2. Add `UsageEvent.creditAmount INTEGER NOT NULL DEFAULT 0`.
3. Backfill one wallet and one journal entry per current profile:

```sql
INSERT INTO "CreditWallet" ("userId", "balance", "createdAt", "updatedAt")
SELECT id, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Profile"
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "CreditTransaction"
  ("id", "userId", "kind", "amount", "balanceAfter", "idempotencyKey", "reason", "createdAt")
SELECT
  gen_random_uuid(),
  id,
  'SIGNUP_GRANT'::"CreditTransactionKind",
  10,
  10,
  'SIGNUP_GRANT:' || id::text,
  'INITIAL_WALLET_BACKFILL',
  CURRENT_TIMESTAMP
FROM "Profile"
ON CONFLICT ("idempotencyKey") DO NOTHING;
```

4. Enable RLS on all four tables.
5. Grant authenticated users `SELECT` on `CreditWallet`,
   `CreditTransaction`, and `PaymentOrder`, but not `PaymentEvent`.
6. Add owner policies comparing `auth.uid()` with `userId`. Payment events stay
   server-only.
7. Set the active Vertex model's `costPerGeneration` to `0.147200`.

- [ ] **Step 3: Update system defaults**

Set `costPerGeneration: 0` for the fake model and `0.1472` for the Vertex model
in both create and update branches of `ensureSystemDefaults`.

- [ ] **Step 4: Generate and validate Prisma**

Run:

```bash
pnpm prisma:generate
pnpm prisma:validate
git diff --check
```

Expected: Prisma generation and validation succeed, and the diff has no
whitespace errors.

- [ ] **Step 5: Review migration safety**

Run:

```bash
rg -n 'CreditWallet|CreditTransaction|PaymentOrder|PaymentEvent|creditAmount|enable row level security|create policy' \
  prisma/schema.prisma \
  prisma/migrations/20260729000000_add_credit_wallet_and_mock_payments/migration.sql
```

Expected: every new table, relation, index, RLS statement, and owner policy is
present; `PaymentEvent` has no authenticated grant.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma \
  prisma/migrations/20260729000000_add_credit_wallet_and_mock_payments/migration.sql \
  src/features/plans/defaults.ts
git commit -m "feat: add credit wallet and payment schema"
```

---

### Task 3: Transactional Credit Wallet Service and Signup Grant

**Files:**
- Create: `src/features/credits/service.ts`
- Modify: `src/lib/auth/current-user.ts`

**Interfaces:**
- Produces: `ensureCreditWallet(tx, userId)`.
- Produces: `getCreditWallet(userId, transactionLimit?)`.
- Produces: `debitGenerationCredits(tx, input)`.
- Produces: `refundReservedGeneration(tx, input)`.
- Produces: `creditPaidOrder(tx, input)`.

- [ ] **Step 1: Define focused service types**

Use the generated Prisma transaction client:

```ts
import type { Prisma } from "@/generated/prisma/client";

type CreditTx = Prisma.TransactionClient;

export type WalletSnapshot = {
  balance: number;
  transactions: Array<{
    id: string;
    kind: CreditTransactionKind;
    amount: number;
    balanceAfter: number;
    reason: string | null;
    createdAt: Date;
  }>;
};
```

- [ ] **Step 2: Implement exactly-once wallet creation**

`ensureCreditWallet` must use `creditWallet.upsert` with a create balance of 10
and an empty update. It then uses `creditTransaction.createMany` with
`skipDuplicates: true` to insert `SIGNUP_GRANT:<userId>`. This avoids catching a
unique violation inside an already-aborted PostgreSQL transaction. Finally it
rereads and returns the wallet.

Do not compute the visible balance by summing the journal on every request.

- [ ] **Step 3: Implement debit and refund operations**

`debitGenerationCredits` takes:

```ts
{
  userId: string;
  generationId: string;
  amount: number;
}
```

It performs `creditWallet.updateMany` with
`where: { userId, balance: { gte: amount } }` and
`data: { balance: { decrement: amount } }`. A zero count throws
`CreditBalanceError("INSUFFICIENT_CREDITS")`. It then reads the resulting
balance and inserts one negative `GENERATION_DEBIT` journal row.

`refundReservedGeneration` takes:

```ts
{
  generationId: string;
  kind: "TECHNICAL_REFUND" | "CANCELLATION_REFUND";
  reason: string;
}
```

It loads `userId` and `creditAmount` from the generation's usage event, then
transitions only a `RESERVED` event to `REFUNDED`. If no row transitions, return
`false`. Otherwise increment that user's wallet by the stored `creditAmount`,
write the positive journal row, and return `true`.

Every balance-mutating service first takes the same per-user PostgreSQL
transaction advisory lock already used by generation reservation:

```ts
await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
```

This serializes payment credits, generation debits, and refunds so each
`balanceAfter` journal snapshot matches the committed movement.

- [ ] **Step 4: Implement purchase credit and wallet reads**

`creditPaidOrder` increments by the order snapshot's `credits`, writes
`PURCHASE:<orderId>`, and sets `creditedAt`. It refuses any order that is not
`PAID` and returns without changing balance when `creditedAt` is already set.

`getCreditWallet` calls `ensureCreditWallet` inside a transaction and returns
the balance plus the latest 30 transactions by default.

- [ ] **Step 5: Integrate signup with auth profile upsert**

After `upsertProfileFromAuthUser` has ensured the profile and plan, call:

```ts
await getDb().$transaction((tx) => ensureCreditWallet(tx, profile.id));
```

Return the profile only after wallet creation succeeds. This makes a first
authenticated request safe even before production backfill has completed.

- [ ] **Step 6: Run static and existing regression checks**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/credits/service.ts src/lib/auth/current-user.ts
git commit -m "feat: add transactional credit wallet service"
```

---

### Task 4: Provider-Independent Payment Orders and Mock API

**Files:**
- Create: `src/features/payments/schema.ts`
- Create: `src/features/payments/provider.ts`
- Create: `src/features/payments/service.ts`
- Create: `src/app/api/v1/credits/route.ts`
- Create: `src/app/api/v1/payment-orders/route.ts`
- Create: `src/app/api/v1/payment-orders/[id]/route.ts`
- Create: `src/app/api/v1/payment-orders/[id]/mock-outcome/route.ts`

**Interfaces:**
- Produces: `paymentOrderCreateSchema`, `paymentOrderIdSchema`, `mockOutcomeSchema`.
- Produces: `CheckoutProvider.createCheckout(order)` and
  `MockPaymentProvider.createOutcomeEvent(order, outcome)`.
- Produces: `createPaymentOrder`, `getOwnedPaymentOrder`,
  `applyPaymentEvent`.

- [ ] **Step 1: Add input schemas**

```ts
export const paymentOrderCreateSchema = z.object({
  packageCode: z.enum(["mini", "standard", "pro"]),
});

export const paymentOrderIdSchema = z.uuid();

export const mockOutcomeSchema = z.object({
  outcome: z.enum(["PAID", "FAILED", "CANCELLED"]),
});
```

- [ ] **Step 2: Implement provider boundary**

Define:

```ts
export type NormalizedPaymentEvent = {
  provider: "MOCK" | "PAYME" | "CLICK";
  providerEventId: string;
  orderId: string;
  outcome: "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
  occurredAt: Date;
};

export interface CheckoutProvider {
  createCheckout(order: {
    id: string;
    amountUzs: number;
    credits: number;
  }): Promise<{ checkoutUrl: string; providerOrderId: string }>;
}
```

`MockPaymentProvider` returns
`/app/credits/checkout/<orderId>` and `mock-<orderId>`. Its outcome event ID is
generated once per submitted click with `crypto.randomUUID()`.

- [ ] **Step 3: Implement order creation and event application**

`createPaymentOrder(userId, packageCode)`:

1. Rejects `PAYMENT_PROVIDER=disabled` with `PAYMENTS_DISABLED`.
2. Resolves the package via `getCreditPackage`.
3. Creates a 30-minute `PENDING` order with immutable package snapshots.
4. Calls the selected provider to obtain checkout data.
5. Stores `providerOrderId`.
6. Returns `{ order, checkoutUrl }`.

`getOwnedPaymentOrder` transitions a still-`PENDING` order to `EXPIRED` when
`expiresAt <= now` before returning it.

`applyPaymentEvent(event)` executes one transaction:

1. Insert `PaymentEvent` with `createMany({ skipDuplicates: true })`; when the
   returned count is zero, load and return the previously processed order.
2. Lock/read the order.
3. Require the event provider and order ID to match.
4. If a pending order is already past `expiresAt`, mark it `EXPIRED` and reject
   later paid/failed/cancelled outcomes.
5. Require `canTransitionPayment(order.status, event.outcome)`.
6. Set the terminal status and `paidAt` for `PAID`.
7. Call `creditPaidOrder` only for `PAID`.
8. Return the final order and resulting balance.

- [ ] **Step 4: Add authenticated API routes**

Responses:

```ts
GET /api/v1/credits
{
  balance: number;
  generationCost: 4;
  packages: CREDIT_PACKAGES;
  paymentMode: "disabled" | "mock";
  transactions: WalletSnapshot["transactions"];
}

POST /api/v1/payment-orders
{ order: PaymentOrderSummary; checkoutUrl: string }

GET /api/v1/payment-orders/:id
{ order: PaymentOrderSummary }

POST /api/v1/payment-orders/:id/mock-outcome
{ order: PaymentOrderSummary; balance: number | null }
```

Map unauthenticated access to 401, unknown package/order to 404, disabled
payments to 503, unsafe mock access to 403, invalid transitions to 409, and Zod
failures to 400.

- [ ] **Step 5: Verify server-only boundaries**

Run:

```bash
pnpm typecheck
pnpm lint
rg -n 'priceUzs|credits' src/app/api/v1/payment-orders src/features/payments
```

Expected: route request bodies contain only `packageCode` or `outcome`; no route
accepts `priceUzs` or `credits` from the browser.

- [ ] **Step 6: Commit**

```bash
git add src/features/payments \
  src/app/api/v1/credits \
  src/app/api/v1/payment-orders
git commit -m "feat: add mock payment order API"
```

---

### Task 5: Four-Credit Generation Reservation and Exact Refunds

**Files:**
- Modify: `src/features/generations/reservation-policy.ts`
- Modify: `src/features/generations/reservation-policy.test.ts`
- Modify: `src/features/generations/reservation.ts`
- Modify: `src/features/generations/worker.ts`
- Modify: `src/features/generations/service.ts`
- Modify: `src/app/api/v1/generations/route.ts`
- Modify: `src/app/api/v1/generations/[id]/retry/route.ts`
- Modify: `src/app/api/v1/generations/[id]/refinements/route.ts`

**Interfaces:**
- Consumes: `debitGenerationCredits`, `refundReservedGeneration`,
  `GENERATION_CREDIT_COST`.
- Produces: `GenerationReservationError("INSUFFICIENT_CREDITS", ...)`.

- [ ] **Step 1: Add failing reservation-policy tests**

```ts
test("requires four available credits for a generation", () => {
  assert.equal(
    reservationPolicy.hasGenerationCredits(4, GENERATION_CREDIT_COST),
    true,
  );
  assert.equal(
    reservationPolicy.hasGenerationCredits(3, GENERATION_CREDIT_COST),
    false,
  );
});
```

Run:

```bash
node --test --experimental-strip-types \
  src/features/generations/reservation-policy.test.ts
```

Expected: FAIL because `hasGenerationCredits` does not exist.

- [ ] **Step 2: Implement and pass the pure policy**

Export `hasGenerationCredits(balance, cost)` using the credit policy and rerun
the focused test. Expected: PASS.

- [ ] **Step 3: Replace daily quota checks in both reservation paths**

For root and refinement reservation:

1. Keep the current per-user advisory lock and duplicate-generation checks.
2. Remove the `dailyGenerationLimit` count as the customer gate.
3. Generate the new generation UUID before insertion.
4. Create the generation with that UUID,
   `estimatedCost: model.costPerGeneration`, and
   `usageEvent.creditAmount: GENERATION_CREDIT_COST`.
5. Call `debitGenerationCredits` in the same transaction before returning.
6. Convert `CreditBalanceError` to
   `GenerationReservationError("INSUFFICIENT_CREDITS",
   "Недостаточно кредитов для генерации")`.

Any thrown debit error must roll back the generation and usage event.

- [ ] **Step 4: Route all refunds through the wallet service**

In `worker.ts`, replace the direct `UsageEvent` refund update with:

```ts
await refundReservedGeneration(tx, {
  generationId,
  kind: "TECHNICAL_REFUND",
  reason: code,
});
```

In `cancelOwnedGeneration`, after changing only a `QUEUED` generation to
`CANCELLED`, call the same service with `CANCELLATION_REFUND`. A `PROCESSING`
generation still returns `false` and receives no refund.

- [ ] **Step 5: Map insufficient credits consistently**

Add `INSUFFICIENT_CREDITS: 402` to root and refinement reservation maps. Update
the retry route to return 402 for this exact error rather than its generic 409.
The response message remains customer-facing and provider-neutral.

- [ ] **Step 6: Invalidate no legacy guarantees**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: PASS, including idempotency, tree, refinement, and reservation-policy
tests.

- [ ] **Step 7: Commit**

```bash
git add src/features/generations \
  src/app/api/v1/generations
git commit -m "feat: charge and refund generation credits"
```

---

### Task 6: Real Balance in Shell and Profile

**Files:**
- Modify: `src/app/app/(dashboard)/layout.tsx`
- Modify: `src/app/api/v1/profile/route.ts`
- Modify: `src/components/profile/profile-panel.tsx`
- Modify: `src/components/app-shell/credit-balance.tsx`

**Interfaces:**
- Consumes: `getCreditWallet(userId, 0)`.
- Extends profile API: `wallet: { balance: number; generationCost: 4 }`.

- [ ] **Step 1: Load balance in the protected layout**

After authentication, query `getCreditWallet(user.id, 0)` and pass
`creditBalance={wallet.balance}` to `AppShell`. Keep redirects and user summary
unchanged.

- [ ] **Step 2: Add wallet summary to profile API**

Load profile, plan usage metadata, and wallet in parallel. Return:

```ts
{
  profile,
  usage,
  wallet: {
    balance: wallet.balance,
    generationCost: GENERATION_CREDIT_COST,
  },
}
```

The existing `usage` payload remains temporarily for plan/watermark
compatibility but is no longer presented as the payment allowance.

- [ ] **Step 3: Replace daily-limit card with a wallet card**

Update `ProfilePayload` and show:

```text
Баланс: <balance> кредитов
Доступно генераций: floor(balance / 4)
Одна генерация: 4 кредита
Кредиты не сгорают
```

Keep the plan name and watermark status as secondary access metadata. The
purchase CTA still links to `/app/credits`.

- [ ] **Step 4: Remove the placeholder top-bar fallback**

`CreditBalance` should render `0 кредитов` for a real zero balance and retain
the fallback only for the brief server-loading case. Its accessible label must
say the exact balance.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/app/'(dashboard)'/layout.tsx \
  src/app/api/v1/profile/route.ts \
  src/components/profile/profile-panel.tsx \
  src/components/app-shell/credit-balance.tsx
git commit -m "feat: show real credit balance"
```

---

### Task 7: Credit Store, Transaction History, and Mock Checkout UI

**Files:**
- Modify: `src/components/credits/credits-grid.tsx`
- Modify: `src/app/app/(dashboard)/credits/page.tsx`
- Create: `src/components/credits/mock-checkout.tsx`
- Create: `src/app/app/(dashboard)/credits/checkout/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/credits`.
- Consumes: `POST /api/v1/payment-orders`.
- Consumes: owned-order GET and mock-outcome POST routes.

- [ ] **Step 1: Convert the credit grid into a client data view**

Fetch `/api/v1/credits` with query key `["credits"]`. Render loading skeletons,
an error card, current balance, and all three server-returned packages.

Format prices with:

```ts
new Intl.NumberFormat("ru-RU").format(priceUzs) + " сум"
```

Compute full generations with `Math.floor(credits / generationCost)`.

- [ ] **Step 2: Create payment orders from package codes**

Each enabled package button sends:

```json
{ "packageCode": "mini" }
```

On success, navigate to the returned `checkoutUrl`. When
`paymentMode === "disabled"`, disable buttons and show:

```text
Оплата временно недоступна. Баланс и пакеты уже готовы к подключению Payme или Click.
```

When `paymentMode === "mock"`, show a visible `Тестовый режим оплаты` badge.

- [ ] **Step 3: Render recent credit transactions**

Map kinds to Russian labels:

```ts
const TRANSACTION_LABELS = {
  SIGNUP_GRANT: "Приветственные кредиты",
  PURCHASE: "Покупка кредитов",
  GENERATION_DEBIT: "Генерация интерьера",
  TECHNICAL_REFUND: "Возврат за техническую ошибку",
  CANCELLATION_REFUND: "Возврат за отменённую генерацию",
  ADMIN_ADJUSTMENT: "Корректировка баланса",
} as const;
```

Show signed amount, resulting balance, and local date. Do not expose raw
idempotency keys, provider IDs, or model names.

- [ ] **Step 4: Implement the mock checkout**

The server page passes only the owned order ID to `MockCheckout`. The client
loads the order and displays snapshotted package name, credits, and UZS amount.
Provide three explicit controls:

- `Симулировать успешную оплату`
- `Симулировать ошибку`
- `Отменить оплату`

After a terminal result, disable every control. On `PAID`, invalidate
`["credits"]` and `["profile"]`, show the new balance, and link back to the
workspace. Failed/cancelled outcomes link back to packages without claiming
payment success.

- [ ] **Step 5: Preserve responsive and accessible behavior**

At 390 px:

- no page-level horizontal overflow;
- buttons remain at least 44 px high;
- outcome controls have unique accessible names;
- status updates use `aria-live="polite"`;
- amounts use tabular numerals.

- [ ] **Step 6: Run static checks**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/credits \
  src/app/app/'(dashboard)'/credits
git commit -m "feat: add UZS credit store and mock checkout"
```

---

### Task 8: Wallet-Aware Root and Refinement UI

**Files:**
- Modify: `src/components/design/design-workspace.tsx`
- Modify: `src/components/design/design-inspector.tsx`
- Modify: `src/components/design/generation-refinement-composer.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/credits`.
- Consumes: API error code `INSUFFICIENT_CREDITS`.

- [ ] **Step 1: Replace daily usage query with wallet query**

Use:

```ts
const creditsQuery = useQuery({
  queryKey: ["credits"],
  queryFn: async () =>
    readJson(await fetch("/api/v1/credits")) as Promise<{
      balance: number;
      generationCost: number;
    }>,
});
```

Invalidate `["credits"]` after reservation, terminal generation completion, and
queued cancellation refund. The debit appears immediately after reservation;
the refund appears after failure/cancellation completes.

- [ ] **Step 2: Make the root inspector balance-aware**

Replace `usage` with:

```ts
credits: { balance: number; generationCost: number } | null | undefined;
```

Show balance and available full generations. Add
`"Недостаточно кредитов. Пополните баланс."` to disabled reasons when
`balance < generationCost`, and render an `/app/credits` link next to the
message.

- [ ] **Step 3: Surface server-side insufficient-credit errors**

Extend the workspace response parser so an API failure preserves both
`error.code` and `error.message`. When the code is `INSUFFICIENT_CREDITS`, show
the purchase link and invalidate `["credits"]` to correct any stale client
balance.

- [ ] **Step 4: Price and gate refinements**

Pass `balance` and `generationCost` to `GenerationRefinementComposer`. Its
submit button reads:

```text
Создать доработку · 4 кредита
```

Disable it when the balance is below four and show the same purchase link.
Successful refinement reservation invalidates `["credits"]`.

- [ ] **Step 5: Verify regression behavior**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: PASS. Root generation, variation, retry, and refinement all use the
same four-credit server gate.

- [ ] **Step 6: Commit**

```bash
git add src/components/design
git commit -m "feat: gate design generation by credit balance"
```

---

### Task 9: Full Verification and Operational Handoff

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Verifies every interface introduced by Tasks 1–8.

- [ ] **Step 1: Validate generated schema and migration**

Run:

```bash
pnpm prisma:generate
pnpm prisma:validate
pnpm db:status
```

First run `pnpm db:migrate:deploy` against the local development database.
Expected: schema validates and `pnpm db:status` reports every migration,
including `20260729000000_add_credit_wallet_and_mock_payments`, as applied.

- [ ] **Step 2: Run the complete automated suite**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 3: Start a safe local mock environment**

Use:

```dotenv
NODE_ENV=development
AI_PROVIDER=fake
PAYMENT_PROVIDER=mock
```

Run `pnpm dev`. Verify `/api/v1/config` still reports mock AI mode and
`/api/v1/credits` reports `paymentMode: "mock"`.

- [ ] **Step 4: Browser-check the happy path**

At desktop width:

1. Sign in and confirm the top bar shows 10 credits for a fresh wallet.
2. Open `/app/credits`.
3. Confirm 20/60/160 credits and 25,000/69,000/169,000 sums.
4. Buy `Мини`, simulate success, and confirm balance becomes 30.
5. Refresh the success page and confirm balance remains 30.
6. Start one generation and confirm balance becomes 26.
7. Confirm a fake-provider success consumes the four credits permanently.

- [ ] **Step 5: Browser-check failure and guard paths**

1. Create another order and simulate failure; balance stays unchanged.
2. Create another order and cancel it; balance stays unchanged.
3. Reduce a test wallet below four credits through a controlled local fixture.
4. Confirm root and refinement actions link to `/app/credits`.
5. Force a fake generation technical failure and confirm one exact four-credit
   refund.
6. Attempt two concurrent generation requests against four credits and confirm
   exactly one succeeds.
7. Check credit and checkout pages at 390 px without horizontal scrolling.

- [ ] **Step 6: Verify unsafe configuration fails**

Run once with:

```dotenv
NODE_ENV=production
AI_PROVIDER=vertex
PAYMENT_PROVIDER=mock
```

Expected: environment validation fails with `MOCK_PAYMENTS_NOT_SAFE` before the
application can expose mock success.

- [ ] **Step 7: Document operator switches**

Update `README.md` with:

```text
PAYMENT_PROVIDER=disabled  # production until Payme/Click is connected
PAYMENT_PROVIDER=mock      # local development only; requires AI_PROVIDER=fake
```

State that production purchase buttons remain disabled until a real adapter and
merchant contract exist.

- [ ] **Step 8: Review final diff and commit verification docs**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Commit only documentation/config corrections created by this task:

```bash
git add README.md .env.example
git commit -m "docs: document mock payment operations"
```

If those files required no correction, do not create an empty commit.
