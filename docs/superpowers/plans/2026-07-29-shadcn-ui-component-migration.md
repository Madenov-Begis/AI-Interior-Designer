# shadcn/ui Component Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Renoa's eight custom UI primitives with registry-generated shadcn/ui components backed by Radix while preserving the existing dark Renoa visual language.

**Architecture:** Generate the official `new-york` Radix components into the existing `src/components/ui` paths, then apply narrowly scoped Renoa compatibility extensions for existing variants and sizes. Migrate the top-bar navigation from the custom native-dialog API to the official Sheet composition and verify both source contracts and user-facing behavior.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn 4.16, Radix UI, class-variance-authority, Node test runner.

## Global Constraints

- Preserve Renoa's dark-only palette, Geist typography, compact density, current routes, copy, responsive behavior, and canvas interactions.
- Registry-generated files must remain recognizably based on official shadcn/ui source.
- `primary`, `success`, and `warning` are allowed only as documented Renoa compatibility extensions.
- The mobile navigation must use Radix Sheet rather than a native `<dialog>`.
- Do not modify unrelated product behavior or user data flows.

---

### Task 1: Add a failing migration contract

**Files:**
- Create: `src/components/ui/shadcn-migration.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the eight files in `src/components/ui`
- Produces: a repeatable source contract proving the official component foundation is present

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ui = (name: string) =>
  readFile(new URL(`./${name}.tsx`, import.meta.url), "utf8");

test("button and badge use class-variance-authority", async () => {
  const [button, badge] = await Promise.all([ui("button"), ui("badge")]);
  assert.match(button, /from "class-variance-authority"/);
  assert.match(badge, /from "class-variance-authority"/);
});

test("sheet uses the official Radix-backed implementation", async () => {
  const sheet = await ui("sheet");
  assert.match(sheet, /from "radix-ui"/);
  assert.doesNotMatch(sheet, /<dialog/);
  assert.match(sheet, /SheetContent/);
});
```

- [ ] **Step 2: Add the test to the project test command**

Append `src/components/ui/shadcn-migration.test.ts` to the explicit `node --test` file list in `package.json`.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
node --test --experimental-strip-types src/components/ui/shadcn-migration.test.ts
```

Expected: both tests fail because the current components are custom implementations.

- [ ] **Step 4: Commit the failing contract**

```bash
git add package.json src/components/ui/shadcn-migration.test.ts
git commit -m "test: define shadcn component migration contract"
```

### Task 2: Generate official shadcn/ui components

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/textarea.tsx`
- Modify: `src/components/ui/separator.tsx`
- Modify: `src/components/ui/skeleton.tsx`
- Modify: `src/components/ui/sheet.tsx`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `components.json`, `src/lib/cn.ts`, and Renoa theme variables
- Produces: official registry source and the `radix-ui`/CVA dependencies

- [ ] **Step 1: Inspect the overwrite**

Run:

```bash
pnpm exec shadcn add button badge card input textarea separator skeleton sheet --dry-run
```

Expected: exactly eight existing files are marked for overwrite and `radix-ui` is listed as a dependency.

- [ ] **Step 2: Generate the components**

Run:

```bash
pnpm exec shadcn add button badge card input textarea separator skeleton sheet --overwrite --yes
```

- [ ] **Step 3: Run the focused migration contract**

Run:

```bash
node --test --experimental-strip-types src/components/ui/shadcn-migration.test.ts
```

Expected: both tests pass.

### Task 3: Restore Renoa compatibility extensions

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/badge.tsx`

**Interfaces:**
- Consumes: official `buttonVariants`, `badgeVariants`, and existing consumer calls
- Produces: existing `Button`, `buttonClassName`, `primary`, `success`, and `warning` contracts

- [ ] **Step 1: Add compile-time compatibility requirements**

Run `pnpm typecheck` immediately after generation and record the failures for removed variants, sizes, or helpers. These failures are the RED state for compatibility.

- [ ] **Step 2: Extend the official Button variants**

Add `primary` as an alias of `default`; retain `default`, `sm`, `lg`, and `icon` sizes. Export:

```ts
export function buttonClassName(
  variant: ButtonVariant = "default",
  className?: string,
  size: ButtonSize = "default",
) {
  return cn(buttonVariants({ variant, size }), className)
}
```

- [ ] **Step 3: Extend official Badge variants**

Add:

```ts
success: "border-success/25 bg-success/12 text-success",
warning: "border-warning/25 bg-warning/12 text-warning",
```

- [ ] **Step 4: Run TypeScript**

Run:

```bash
pnpm typecheck
```

Expected: only Sheet-consumer errors may remain.

### Task 4: Migrate the mobile navigation to official Sheet

**Files:**
- Modify: `src/components/app-shell/app-topbar.tsx`
- Modify: `src/components/ui/sheet.tsx` only for documented Renoa visual classes if needed

**Interfaces:**
- Consumes: official `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, and `SheetClose`
- Produces: left-side mobile navigation with controlled open state and close-on-navigation behavior

- [ ] **Step 1: Confirm the Sheet API compile failure**

Run:

```bash
pnpm typecheck
```

Expected: the old `SheetBody` and `SheetClose onClose` composition does not compile against the official API.

- [ ] **Step 2: Update the top-bar composition**

Use:

```tsx
<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
  <SheetContent side="left" className="w-[min(21rem,88vw)] p-0">
    <SheetHeader className="flex-row items-center border-b p-4">
      ...
      <SheetClose asChild>
        <Button variant="ghost" size="icon" className="ml-auto" aria-label="Закрыть меню">
          <X className="size-4" />
        </Button>
      </SheetClose>
    </SheetHeader>
    <div className="min-h-0 flex-1 overflow-y-auto">
      ...
    </div>
  </SheetContent>
</Sheet>
```

Keep `AppSidebar onNavigate={() => setMenuOpen(false)}`.

- [ ] **Step 3: Run TypeScript and focused tests**

Run:

```bash
pnpm typecheck
node --test --experimental-strip-types src/components/ui/shadcn-migration.test.ts
```

Expected: both commands pass.

### Task 5: Verify the full migration

**Files:**
- Modify only files required to resolve migration-caused regressions

**Interfaces:**
- Consumes: the complete migrated application
- Produces: a verified shadcn/Radix foundation with no known regressions

- [ ] **Step 1: Run all automated checks**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Expected: every command exits with status 0.

- [ ] **Step 2: Verify registry state**

```bash
pnpm exec shadcn info
```

Expected: the eight components are listed and the project base is `radix`.

- [ ] **Step 3: Verify visually**

Check the landing page and login at 1440×900, then the landing and mobile navigation at 390×844. Confirm Renoa colors, typography, CTA proportions, focus behavior, Sheet overlay, close behavior, and absence of horizontal overflow.

- [ ] **Step 4: Review the final diff**

```bash
git diff --check
git status --short
```

Confirm that only the migration, installation, plan, and verification artifacts are present.

