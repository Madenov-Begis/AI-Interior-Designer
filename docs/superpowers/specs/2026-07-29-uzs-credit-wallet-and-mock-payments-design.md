# Renoa UZS Credit Wallet and Mock Payments

Date: 2026-07-29  
Status: approved in conversation and written-spec review  
Currency: UZS  
Generation price: 4 credits

## Goal

Replace Renoa's presentational credit UI and daily generation quota with a real,
transactional credit wallet. Launch with three one-time packages denominated in
Uzbekistani sums and a development-only mock payment provider that can later be
replaced by Payme or Click without changing wallet or generation accounting.

## Product model

- Every new user receives 10 free credits exactly once.
- Existing users receive the same one-time 10-credit grant when wallets are
  introduced.
- One root generation or refinement costs 4 credits.
- Purchased credits do not expire.
- A technical generation failure automatically refunds the reserved credits.
- The first release uses one-time credit packages, not subscriptions.
- Subscription plans, promo codes, cash refunds, receipts, corporate invoices,
  and a real payment provider are outside the first release.

The customer-facing behavior follows the useful parts of Aidentika's internal
currency model: a shared non-expiring balance, a fixed operation price, and an
automatic refund on technical failure. Renoa retains its own packages, pricing,
brand, and payment infrastructure.

## Packages

| Code | Name | Credits | Full generations | Price |
| --- | --- | ---: | ---: | ---: |
| `mini` | Мини | 20 | 5 | 25,000 UZS |
| `standard` | Стандарт | 60 | 15 | 69,000 UZS |
| `pro` | Про | 160 | 40 | 169,000 UZS |

Prices and credit amounts are authoritative server-side product configuration.
A payment order stores immutable snapshots of the selected package code, display
name, UZS amount, and granted credits. A later package change cannot alter an
existing order.

UZS amounts are stored as integer sums. The application never accepts a price or
credit quantity supplied by the browser.

## Unit economics

Renoa currently uses `gemini-3-pro-image`. Google's published standard pricing
for a 1K/2K result is USD 0.134 per output image and USD 0.0011 per input image.
The current request contains one source image, optionally one visual-prompt
image, and up to ten references. The conservative maximum provider cost is
therefore:

```text
USD 0.134 + (12 × USD 0.0011) = USD 0.1472
```

At the Central Bank of Uzbekistan rate of 12,050.34 UZS per USD on 2026-07-29,
that is approximately 1,774 UZS. Product budgeting rounds this to 2,100 UZS per
successful generation to cover image processing, storage, normal cost
variation, and a small operational reserve.

The launch packages produce these approximate economics when every credit is
used:

| Package | Revenue per generation | Gross margin against 2,100 UZS budget |
| --- | ---: | ---: |
| Мини | 5,000 UZS | 58.0% |
| Стандарт | 4,600 UZS | 54.3% |
| Про | 4,225 UZS | 50.3% |

The 10-credit signup grant exposes Renoa to at most two full successful
generations, or a budgeted 4,200 UZS per registered account. Two credits remain
and can be combined with a later purchase.

Package prices do not change automatically with exchange rates. The generation
cost assumption and packages are reviewed manually. Each generation stores a
snapshot of its configured estimated provider cost so historical reporting does
not change when assumptions are updated.

Sources:

- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Central Bank of Uzbekistan exchange-rate JSON](https://cbu.uz/ru/arkhiv-kursov-valyut/json/)
- [Aidentika credit behavior](https://docs.aidentika.com/sparks)

## Architecture

### Credit wallet

`CreditWallet` has one row per profile and holds the current available integer
balance. It is a transactionally maintained projection for fast reads; the
immutable transaction journal remains the audit trail.

`CreditTransaction` records every balance movement:

- signup grant;
- package purchase;
- generation debit;
- technical refund;
- future administrator adjustment.

Every transaction stores the signed credit amount, resulting balance, reason,
creation time, and the relevant order or generation reference. Idempotency
constraints ensure that one signup, purchase, generation, or refund cannot
produce the same balance movement twice.

Wallet creation and the 10-credit signup transaction happen atomically. The
migration/backfill applies the same operation to existing profiles that do not
yet have a wallet.

### Payment orders and events

`PaymentOrder` belongs to one user and stores:

- provider and provider order identifier;
- package snapshots;
- integer UZS amount;
- granted credits;
- current state;
- timestamps for creation, payment, expiry, and crediting.

Allowed order state transitions are:

```text
PENDING -> PAID
PENDING -> FAILED
PENDING -> CANCELLED
PENDING -> EXPIRED
```

Terminal states never transition to another state. A paid order can be credited
only once.

`PaymentEvent` records each received provider event with a provider-scoped
unique event identifier. Event recording, order transition, wallet increment,
and purchase journal entry occur in one database transaction. Redelivery of the
same event returns the existing result without granting credits again.

### Payment provider boundary

The application defines a provider interface for:

- creating a checkout for an existing server-side order;
- parsing and authenticating a provider event;
- mapping the provider result into Renoa's internal payment states.

`MockPaymentProvider` implements the interface for development and test. Its
checkout allows the signed-in owner to simulate success, failure, or
cancellation. The success path must call the same application service that a
future Payme or Click webhook will call.

Mock checkout is enabled only by explicit environment configuration. Startup
validation rejects a configuration that enables mock payments in production or
combines customer-triggered mock success with the paid Vertex provider. Until a
real provider is configured, production purchase buttons remain unavailable and
must not imply that money was accepted.

## Generation accounting

Credit enforcement replaces the current daily quota as the customer payment
gate. Existing maximum-parallel-generation rules remain.

Reservation of a root generation or refinement occurs in one database
transaction under the existing per-user advisory lock:

1. Resolve the selected generation model and the four-credit price.
2. Return an existing generation for a repeated idempotency key.
3. Verify that the wallet has at least four available credits.
4. Atomically subtract four credits and write the generation debit journal
   entry.
5. Create the generation, its immutable input snapshot, and its reserved usage
   event with `creditAmount = 4`.
6. Store the configured estimated provider-cost snapshot on the generation.

An insufficient wallet returns the dedicated `INSUFFICIENT_CREDITS` domain
error and does not create a generation or debit.

On success, the reserved usage event becomes consumed. No second balance
movement is needed because the debit occurred at reservation.

On technical failure, one database transaction marks the generation failed,
changes the reserved usage event to refunded, restores exactly its stored
`creditAmount`, and writes one refund journal entry. Reprocessing the same
failure is idempotent.

User cancellation refunds credits only when the job was still queued and the
provider request had not begun. Once the provider request has begun, cancellation
does not automatically refund credits because Renoa may already owe the provider
cost.

## User experience

The real wallet balance appears in:

- the application top bar;
- the profile page;
- the credit page;
- the generation action area.

The generation action continues to show `Создать дизайн · 4 кредита`. When the
balance is below four, the action does not start a request and directs the user
to `/app/credits`.

The credit page shows:

- current balance;
- the three UZS packages;
- full-generation equivalents;
- the four-credit generation price;
- the non-expiry and technical-refund policies;
- recent credit transactions;
- an explicit test-payment notice when mock checkout is enabled.

The mock checkout shows the order snapshot and separate controls for successful,
failed, and cancelled outcomes. A success confirmation is shown only after the
server has marked the order paid and credited the wallet.

Customer-facing errors never expose model, provider, credential, or database
details.

## Security and consistency

- All order, wallet, and generation writes are server-side.
- A user can read and act on only their own wallet and orders.
- Package price and credit quantity are resolved from server configuration.
- Balance updates and journal entries commit atomically.
- Per-user locking and conditional balance updates prevent a negative balance
  under concurrent generation attempts.
- Database uniqueness constraints enforce idempotency independently of route
  code.
- Provider events are authenticated by the provider adapter. The mock adapter is
  available only in its explicitly safe environment.
- Row-level access remains read-only for relevant customer-owned records; users
  cannot directly mutate balances or payment state.
- Audit records contain identifiers and amounts but no provider secrets or card
  data.

## API surface

The first release adds authenticated routes for:

- reading wallet balance and recent credit transactions;
- listing the active server-side credit packages;
- creating a payment order from a package code;
- reading an owned payment order;
- starting the mock checkout;
- submitting one of the safe mock outcomes.

Provider-specific webhook routes are deferred until a real provider is selected.
The mock outcome route calls the provider-independent event-processing service,
so that service is already testable before Payme or Click integration.

Existing generation routes return `INSUFFICIENT_CREDITS` when appropriate. The
shared API error contract maps it to a customer-readable message and a link to
the credit page.

## Testing

Automated tests cover:

- an exactly-once 10-credit grant for new and existing users;
- package ordering, UZS formatting, and server-authoritative values;
- successful, failed, and cancelled mock orders;
- duplicate payment-event delivery;
- immutable order snapshots after package configuration changes;
- concurrent generation attempts near the available balance;
- insufficient-credit rejection with no partial records;
- one four-credit debit for an idempotently repeated generation request;
- one exact refund for a technical failure;
- queued cancellation refund and post-provider-start non-refund;
- real balance presentation in the shell, profile, and generation UI;
- environment validation that prevents unsafe mock configuration.

Verification includes Prisma validation and migration review, focused Node tests,
the complete test suite, TypeScript, ESLint, production build, and browser checks
of the credit purchase and insufficient-balance paths at desktop and mobile
widths.

## Out of scope

- recurring subscriptions or automatic renewals;
- expiring monthly allowances;
- promo or referral codes;
- cash refunds and chargebacks;
- fiscal receipts and corporate invoices;
- multi-user corporate wallets;
- administrator balance-adjustment UI;
- production Payme or Click credentials and webhook endpoints.

The ledger includes an administrator-adjustment reason for future compatibility,
but this release exposes no customer or administrator action that can use it.
