# Renoa Aidentika-Inspired Product UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved dark Renoa product UI directly in the existing Next.js application while preserving the working canvas and generation system.

**Architecture:** Introduce shared product navigation and credit presentation configuration, local shadcn-style UI primitives, and a reusable protected app shell. Adopt those building blocks incrementally in the canvas, history, profile, credits, login, and landing surfaces without changing the generation API contract.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui source conventions, Lucide React, TanStack Query, existing Prisma/Supabase services.

## Global Constraints

- Work on the existing `master` checkout as previously authorized.
- Do not commit or push.
- Dark theme only.
- Keep Renoa name controlled by `NEXT_PUBLIC_APP_NAME`.
- Do not use Pencil exports as a visual source.
- Do not expose Gemini, Vertex AI, provider names, or model names to customers.
- Root and refinement generation price is 4 credits.
- State that technical failures return credits.
- Preserve existing project, canvas, refinement, history, authentication, and storage behaviour.

---

### Task 1: Shared product configuration and shadcn foundation

**Files:**
- Create: `components.json`
- Create: `src/config/product.ts`
- Create: `src/config/product.test.ts`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/app/globals.css`
- Modify: `package.json`

**Interfaces:**
- Produces `GENERATION_CREDIT_COST`, `CREDIT_PACKAGES`, and `APP_NAV_ITEMS`.
- Produces reusable shadcn-style UI source components.

- [ ] Write a failing Node test that asserts generation cost is 4, packages are ordered `[50, 140, 400, 1200, 5000]`, and protected navigation routes are unique.
- [ ] Run the focused test and confirm it fails because `src/config/product.ts` does not exist.
- [ ] Add the shared configuration and UI primitives.
- [ ] Add the new test to the `test` script and run it until green.
- [ ] Run typecheck and lint for the new foundation.

### Task 2: Protected application shell

**Files:**
- Create: `src/components/app-shell/app-shell.tsx`
- Create: `src/components/app-shell/app-sidebar.tsx`
- Create: `src/components/app-shell/app-topbar.tsx`
- Create: `src/components/app-shell/credit-balance.tsx`
- Modify: `src/app/app/history/page.tsx`
- Modify: `src/app/app/profile/page.tsx`

**Interfaces:**
- Consumes `APP_NAV_ITEMS` and shadcn primitives.
- Produces a common desktop/mobile shell for protected non-canvas pages.

- [ ] Add a failing route-policy assertion for `/app/credits` as a protected route if the existing policy does not already protect all `/app/*`.
- [ ] Implement responsive topbar/sidebar composition with semantic navigation and active-route styling.
- [ ] Adopt the shell in history and profile pages.
- [ ] Run route tests, typecheck, and lint.

### Task 3: Canvas-first editor redesign

**Files:**
- Modify: `src/components/design/workspace-header.tsx`
- Modify: `src/components/design/design-workspace.tsx`
- Modify: `src/components/design/design-inspector.tsx`
- Modify: `src/components/design/style-picker.tsx`
- Modify: `src/components/design/empty-source-workspace.tsx`
- Modify: `src/components/design/generation-context-overlay.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes `GENERATION_CREDIT_COST`, existing generation mutations, existing canvas, and existing refinement tree.
- Keeps the existing API request bodies unchanged.

- [ ] Add a failing pure presentation test for generation cost and refund copy.
- [ ] Replace the workspace header with Renoa brand, project context, history, credits, and profile actions.
- [ ] Restyle the inspector to show only references, requested changes, style, format, cost, refund rule, and primary action.
- [ ] Keep horizontal scrolling inside `StylePicker` only.
- [ ] Improve empty source state so upload happens visually on the canvas.
- [ ] Preserve and restyle contextual selected-result actions.
- [ ] Run tests, typecheck, and lint.

### Task 4: History and profile redesign

**Files:**
- Modify: `src/components/history/history-grid.tsx`
- Modify: `src/components/profile/profile-panel.tsx`
- Modify: `src/app/app/history/page.tsx`
- Modify: `src/app/app/profile/page.tsx`

**Interfaces:**
- Consumes existing paginated history and profile APIs.
- Produces Aidentika-inspired project cards and account surfaces using shared shell components.

- [ ] Restyle history filters, empty/loading/error states, project cards, and actions with shadcn primitives.
- [ ] Add clear parent/child iteration labels from existing generation data where available.
- [ ] Restyle identity, Google connection, usage, and credit entry points in profile.
- [ ] Run typecheck and lint.

### Task 5: Credits page

**Files:**
- Create: `src/app/app/credits/page.tsx`
- Create: `src/components/credits/credits-grid.tsx`

**Interfaces:**
- Consumes `CREDIT_PACKAGES` and `GENERATION_CREDIT_COST`.
- Produces honest purchase entry points with no fake success state.

- [ ] Add the protected credits route and shared shell.
- [ ] Render five packages, mark 400 as popular, and explain the 4-credit price and technical refund.
- [ ] Keep purchase actions disabled or labelled as unavailable until a payment provider exists.
- [ ] Run route tests, typecheck, and lint.

### Task 6: Dark landing and login

**Files:**
- Modify: `src/components/marketing/site-header.tsx`
- Modify: `src/components/marketing/hero.tsx`
- Modify: `src/components/marketing/process-section.tsx`
- Create: `src/components/marketing/examples-section.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Uses existing authentication entry policy and real interior style assets.
- Produces the before → style → after demonstration and room/style examples.

- [ ] Build the compact dark header and product-led hero.
- [ ] Add a real three-part before/style/after demonstration using product imagery.
- [ ] Add room/style example cards and transparent credit/refund copy.
- [ ] Align login with the same dark product system.
- [ ] Run typecheck and lint.

### Task 7: Verification and design QA

**Files:**
- Create: `design-qa.md`

**Interfaces:**
- Verifies the completed product surfaces without changing APIs or data.

- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm prisma:validate`.
- [ ] Run `pnpm build`.
- [ ] Start the local app and inspect desktop and mobile states in the in-app browser.
- [ ] Check navigation, style selection, format selection, prompt entry, generation cost, refund copy, result actions, history, profile, credits, and landing CTA.
- [ ] Save visual QA evidence and final result in `design-qa.md`.

