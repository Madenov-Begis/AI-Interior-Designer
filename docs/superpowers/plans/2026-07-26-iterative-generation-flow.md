# Iterative Generation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide model selection, support branchable refinements of generated interiors with prompt/reference/markup inputs, and reduce workspace query load.

**Architecture:** Keep every root or child result as an immutable `Generation` snapshot and connect refinements through `parentGenerationId`. Root reservations resolve the configured provider model on the server; child reservations inherit model/style/format and use the parent’s clean result. The workspace renders one composer/editor for the selected successful result and polls only newly created generation IDs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, Supabase Storage, TanStack Query, Fabric 7, Sharp, Zod 4, Node test runner.

## Global Constraints

- Work directly on `master`.
- Do not create commits and do not push.
- Production root generations always resolve an active plan-allowed Gemini/Vertex model; explicit fake-provider local development may resolve the fake model.
- Child requests cannot override model, style, aspect ratio, source, or ownership.
- Generated-result markup is guidance only and must not appear in the final output.
- Image binaries remain in Supabase Storage; PostgreSQL stores metadata and relations only.
- Only the style rail may horizontally scroll; the inspector and page must remain width-contained.
- Full generation-list polling must be replaced with per-generation status polling.

---

### Task 1: Generation tree schema and public contracts

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260726000000_add_generation_refinements/migration.sql`
- Modify: `src/features/generations/schema.ts`
- Create: `src/features/generations/schema.test.ts`
- Modify: `src/components/design/workspace-types.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: nullable `Generation.parentGenerationId`, `Generation.parentGeneration`, and `Generation.refinements`.
- Produces: strict `createGenerationSchema` without `modelCode`.
- Produces: `createRefinementSchema` for `{ prompt, referenceFileIds }` and paired visual-prompt form validation.
- Produces: `WorkspaceGeneration.parentGenerationId` and result dimensions.

- [ ] **Step 1: Write failing contract tests**

Add Node tests proving that root input accepts project/prompt/style/format, rejects `modelCode`, refinement input preserves ordered UUIDs, and overlay/canvas-state pairing rejects one-sided input.

```ts
test("root generation input rejects client model selection", () => {
  assert.throws(() =>
    createGenerationSchema.parse({
      projectId: crypto.randomUUID(),
      prompt: "Новый интерьер",
      aspectRatio: "RATIO_16_9",
      modelCode: "customer-choice",
    }),
  );
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
node --test --experimental-strip-types src/features/generations/schema.test.ts
```

Expected: failure because the strict public/refinement contracts are not implemented.

- [ ] **Step 3: Add the self-relation and SQL migration**

Add:

```prisma
parentGenerationId String?      @db.Uuid
parentGeneration   Generation?  @relation("GenerationRefinements", fields: [parentGenerationId], references: [id])
refinements         Generation[] @relation("GenerationRefinements")

@@index([parentGenerationId, createdAt])
```

Create SQL with the nullable column, self foreign key, and composite index. Do not rewrite existing rows.

- [ ] **Step 4: Implement strict request schemas and workspace types**

Use `.strict()` on `createGenerationSchema`. Add:

```ts
export const createRefinementSchema = z.object({
  prompt: z.string().trim().min(3).max(4000),
  referenceFileIds: z.array(z.uuid()).max(10),
}).strict();
```

Add a helper that parses multipart `referenceFileIds`, `overlay`, and `canvasState` and enforces both-or-neither for markup.

- [ ] **Step 5: Register and run tests**

Add `src/features/generations/schema.test.ts` to `pnpm test`, then run:

```bash
pnpm test
pnpm exec prisma validate
pnpm exec prisma generate
```

Expected: all tests pass and Prisma client generation succeeds.

- [ ] **Step 6: Checkpoint without committing**

Run `git diff --check` and leave all files uncommitted per user instruction.

---

### Task 2: Server-owned model selection and root reservation

**Files:**
- Modify: `src/features/generations/reservation.ts`
- Create: `src/features/generations/reservation-policy.ts`
- Create: `src/features/generations/reservation-policy.test.ts`
- Modify: `src/app/api/v1/generations/route.ts`
- Modify: `src/features/generations/service.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `resolveRequiredProvider(aiProvider: string | undefined): "FAKE" | "VERTEX_AI"`.
- Produces: `reserveRootGeneration({ userId, projectId, prompt, aspectRatio, styleCode, idempotencyKey })`.
- Keeps: common profile, plan, usage, parallel, project, and idempotency checks inside reservation service.

- [ ] **Step 1: Write failing provider-policy tests**

Cover explicit fake local mode, Vertex production mode, and rejection of unsupported configuration.

```ts
assert.equal(resolveRequiredProvider("fake"), "FAKE");
assert.equal(resolveRequiredProvider("vertex"), "VERTEX_AI");
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run the new policy test directly and confirm the missing helper failure.

- [ ] **Step 3: Implement server-side model resolution**

Inside the reservation transaction, select one active model allowed by the current plan:

```ts
const model = await tx.aiModel.findFirst({
  where: {
    active: true,
    provider: resolveRequiredProvider(process.env.AI_PROVIDER),
    plans: { some: { planId: plan.id } },
  },
  orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
});
```

Validate the selected model supports the requested root aspect ratio. Map absence to the existing model-unavailable reservation contract.

- [ ] **Step 4: Rename and narrow the root reservation interface**

Replace the public `reserveGeneration` root usage with `reserveRootGeneration`; remove `modelCode` from the input and project update decisions. Continue persisting the server-selected `modelId`.

- [ ] **Step 5: Update the root route**

Parse the strict schema, call `reserveRootGeneration`, keep idempotency and worker scheduling, and change validation copy from “инструкцию, модель и формат” to “инструкцию и формат”.

- [ ] **Step 6: Run tests and static checks**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: no client-controlled model path remains in root creation.

- [ ] **Step 7: Checkpoint without committing**

Inspect `rg -n "modelCode" src/app src/components/design src/features/generations` and retain only internal/admin or migration-compatible occurrences.

---

### Task 3: Child reservation, reference uploads, and visual-prompt composition

**Files:**
- Modify: `src/features/generations/reservation.ts`
- Create: `src/features/generations/refinement.ts`
- Create: `src/features/generations/refinement-policy.ts`
- Create: `src/features/generations/refinement-policy.test.ts`
- Modify: `src/features/visual-prompt/service.ts`
- Create: `src/app/api/v1/generations/[id]/refinement-references/route.ts`
- Create: `src/app/api/v1/generations/[id]/refinements/route.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `reserveRefinement({ userId, parentGenerationId, prompt, referenceFileIds, visualPromptImageId, idempotencyKey })`.
- Produces: `uploadRefinementReferences(userId, parentGenerationId, files)`.
- Produces: `composeGenerationVisualPrompt({ userId, parentGenerationId, overlayFile, state })`.
- Consumes: parent `resultOriginalId`, inherited model/style/aspect ratio, strict refinement contracts.

- [ ] **Step 1: Write failing pure-policy tests**

Define and test:

```ts
export function buildRefinementSnapshot(parent: {
  id: string;
  projectId: string;
  modelId: string;
  styleCode: string | null;
  aspectRatio: AspectRatio;
  resultOriginalId: string | null;
  status: GenerationStatus;
})
```

It must reject non-successful/no-result parents and return inherited immutable fields plus `parentGenerationId` and `sourceImageId`.

- [ ] **Step 2: Run focused test and confirm RED**

Expected: missing policy module.

- [ ] **Step 3: Add generation-scoped reference upload service**

Reuse `validateReferenceImage`, `REFERENCE_IMAGE_RULES`, `STORAGE_BUCKETS.referenceImages`, and existing media metadata conventions. Validate the parent is owned and successful before upload. Store files under:

```text
users/{userId}/generations/{parentId}/refinement-references/{fileId}.webp
```

Create `MediaFile(type: REFERENCE)` only; do not create `ProjectReference` or `GenerationReference` yet.

- [ ] **Step 4: Generalize visual-prompt composition**

Extract the existing overlay validation/scaling/compositing into a helper that accepts an arbitrary owned stored source. The project endpoint continues calling it with the project source. Refinement composition calls it with the parent’s `resultOriginal` and stores the output under the child/refinement namespace.

- [ ] **Step 5: Implement `reserveRefinement`**

Within the existing idempotent usage transaction:

1. fetch the owned, non-deleted successful parent and clean result;
2. verify each ordered reference ID belongs to the user, has type `REFERENCE`, and is not deleted;
3. apply plan reference count and parallel-generation limits;
4. build the refinement final prompt without reapplying a style modifier;
5. create the child with inherited model/style/aspect, parent clean result as source, submitted prompt, markup file, ordered reference rows, and usage reservation.

- [ ] **Step 6: Implement both routes**

The upload route accepts multipart `files`. The refinement route accepts multipart prompt/reference IDs/optional overlay and state, requires an idempotency key, creates markup when present, reserves the child, schedules `processGeneration`, and returns `202`.

Map ownership-sensitive parent failures to a single `GENERATION_NOT_FOUND` 404 response. Map invalid markup/reference input to 400, usage limits to 429, and parallel generation to 409.

- [ ] **Step 7: Verify backend behavior**

Run:

```bash
pnpm test
pnpm exec prisma validate
pnpm typecheck
pnpm lint
```

- [ ] **Step 8: Checkpoint without committing**

Review Storage cleanup paths for upload/composition failures and run `git diff --check`.

---

### Task 4: Point polling and generation-tree response

**Files:**
- Modify: `src/features/generations/service.ts`
- Modify: `src/app/api/v1/generations/[id]/route.ts`
- Modify: `src/components/design/workspace-types.ts`
- Create: `src/features/generations/tree.ts`
- Create: `src/features/generations/tree.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: list/get payloads containing `parentGenerationId`, result dimensions, ordered references, and no customer-facing model.
- Produces: `buildGenerationLabels(items): Map<string, string>` using `createdAt` then `id` sibling ordering.
- Consumes: TanStack point queries keyed by `["generation", id]`.

- [ ] **Step 1: Write failing tree-label tests**

Cover roots `1`, `2`, siblings `1.1`, `1.2`, and a grandchild `1.1.1`, independent of input array order.

- [ ] **Step 2: Run the test and confirm RED**

- [ ] **Step 3: Implement stable tree labels**

Use `parentGenerationId`, group siblings, sort by `createdAt` then `id`, and walk only loaded rows. Orphans in a paginated page receive a neutral `Вариант` fallback rather than causing recursion.

- [ ] **Step 4: Enrich list/get selections**

Include parent ID, `resultUser.width/height`, and ordered reference IDs/preview metadata. Stop selecting model name for customer responses.

- [ ] **Step 5: Run tests and typecheck**

Run `pnpm test && pnpm typecheck`.

- [ ] **Step 6: Checkpoint without committing**

Confirm list pagination stays at 20 and no recursive SQL query was introduced.

---

### Task 5: Simplify the inspector and contain style overflow

**Files:**
- Modify: `src/components/design/design-workspace.tsx`
- Modify: `src/components/design/design-inspector.tsx`
- Modify: `src/components/design/style-picker.tsx`
- Modify: `src/components/design/result-actions.tsx`

**Interfaces:**
- Removes: workspace `/api/v1/models` query, `modelCode` state, model props, selector, customer model labels.
- Produces: root generation body containing only project, prompt, style, and format.
- Keeps: available root ratios from the fixed public format set.

- [ ] **Step 1: Remove the model query and state**

Delete `Model`, `modelsQuery`, `modelCode`, selection effects, model errors, and model loading reasons. Use the schema-supported aspect ratio list for root format choices.

- [ ] **Step 2: Simplify the inspector contract**

Replace `Модель и формат` details with a visible `Формат` fieldset. Remove model props and all model copy.

- [ ] **Step 3: Remove model details from results**

Delete model names from image alt text, comparison headers, details, and customer-facing workspace types.

- [ ] **Step 4: Contain horizontal overflow**

Apply `min-w-0 max-w-full overflow-x-hidden` to inspector ancestors. Change the style picker to:

```tsx
<div className="mt-3 min-w-0 max-w-full overflow-hidden">
  <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain px-2 py-2">
```

Keep style cards `shrink-0`.

- [ ] **Step 5: Run UI static checks**

Run `pnpm typecheck && pnpm lint && git diff --check`.

- [ ] **Step 6: Checkpoint without committing**

Use `rg -n "Модель|modelsQuery|modelCode|generation.model" src/components/design` and confirm no customer model UI remains.

---

### Task 6: Selected-result editor and universal refinement composer

**Files:**
- Modify: `src/features/visual-prompt/types.ts`
- Modify: `src/components/design/visual-prompt-editor.tsx`
- Modify: `src/components/design/canvas-viewport.tsx`
- Modify: `src/components/design/generation-canvas-card.tsx`
- Create: `src/components/design/generation-refinement-composer.tsx`
- Create: `src/features/generations/refinement-draft.ts`
- Create: `src/features/generations/refinement-draft.test.ts`
- Modify: `src/components/design/design-workspace.tsx`
- Modify: `package.json`

**Interfaces:**
- Extends: `VisualPromptEditorHandle.snapshot(): Promise<{ state: VisualPromptCanvasState; overlay: Blob } | null>`.
- Produces: local draft helpers keyed by `{ userScope, generationId }` for prompt and canvas state.
- Produces: `GenerationRefinementComposer` with current references, uploads, removal, drag/drop, submit, and inline errors.

- [ ] **Step 1: Write failing local-draft tests**

Test serialization, invalid/corrupt storage fallback, per-generation isolation, and clear-after-success behavior using an injected storage interface.

- [ ] **Step 2: Run focused tests and confirm RED**

- [ ] **Step 3: Add non-persisting editor snapshots**

Refactor Fabric export so `snapshot()` returns state plus transparent PNG without calling the project API. Keep `persist()` behavior for the source editor. Loading an initial local state must reuse existing Fabric state restoration.

- [ ] **Step 4: Render the editor on the selected successful result**

Pass result URL and dimensions into the canvas node. When selected, layer `VisualPromptEditor` over the result image and bind the shared toolbar/history callbacks to that editor. Non-selected result cards render static images and do not mount active Fabric canvases.

Increase selected-card height to fit the composer and include the dynamic height in `CanvasViewport` world bounds/row layout.

- [ ] **Step 5: Implement the universal composer**

Show it automatically only for the selected successful generation. Initialize prompt/canvas draft from local storage and references from the parent snapshot. Support:

- textarea validation;
- add via file picker;
- drag/drop;
- reference preview/removal;
- upload progress/errors;
- multipart child submission with a fresh idempotency key;
- clearing the draft only after `202`;
- selecting the new child card when it appears.

- [ ] **Step 6: Route toolbar operations to the selected editor**

Maintain source and result editor refs. `undo`, `redo`, delete, clear, and persist/snapshot operations target the selected item. Root generation persists the source editor; child generation snapshots the selected result editor.

- [ ] **Step 7: Run focused and full checks**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

- [ ] **Step 8: Checkpoint without committing**

Inspect keyboard focus, nested button event propagation, and local-storage keys for user/project isolation.

---

### Task 7: Replace list polling and verify the full story

**Files:**
- Modify: `src/components/design/design-workspace.tsx`
- Modify: `src/components/design/generation-canvas-card.tsx`
- Modify: `src/components/design/canvas-viewport.tsx`
- Modify: `docs/superpowers/plans/2026-07-26-iterative-generation-flow.md`

**Interfaces:**
- Removes: list-query `refetchInterval`.
- Produces: one point query per newly created active generation, stopping at terminal status and invalidating list/usage once.

- [ ] **Step 1: Remove full-list polling**

Delete the `refetchInterval` from `["generations", project.id]`.

- [ ] **Step 2: Add scoped active-generation polling**

Track IDs returned by root/refinement mutations. Poll `GET /api/v1/generations/:id` at 1500 ms only while status is `QUEUED` or `PROCESSING`; stop at terminal status, remove the ID, and invalidate list/usage once.

On initial page load, point-poll only active rows already present in the first page.

- [ ] **Step 3: Run complete automated verification**

Run:

```bash
pnpm test
pnpm exec prisma validate
pnpm exec prisma generate
pnpm typecheck
pnpm lint
pnpm build
git diff --check
```

- [ ] **Step 4: Apply the local migration**

Run `pnpm db:migrate` only against the configured local development database. Confirm migration status with `pnpm db:status`. Do not apply or deploy the migration to production.

- [ ] **Step 5: Verify in the browser**

Run the local app and verify:

1. no model selector or model name is visible;
2. the page has no horizontal overflow while the style rail scrolls;
3. a root generation succeeds;
4. selecting the result opens one composer;
5. adding/removing a reference works;
6. drawing on the result is submitted as guidance;
7. the child uses inherited style/format and appears in the correct branch;
8. only active-generation status requests repeat in the network log;
9. download still returns a valid JPG.

- [ ] **Step 6: Final uncommitted review**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Leave every implementation and plan file uncommitted. Do not push or deploy.
