# Floating Refinement Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the refinement form embedded inside a generated card with an unscaled contextual toolbar and floating refinement panel anchored to the selected successful generation.

**Architecture:** `CanvasViewport` remains the owner of pan/zoom geometry and renders one screen-space overlay for the selected generation. `DesignWorkspace` owns the selected canvas instance, duplicate instances, refinement mutation, and open/closed editor state. The existing composer keeps draft, reference, and submit behavior but becomes a focused popover.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Lucide React, TanStack Query, Node test runner.

## Global Constraints

- The refinement panel opens only after pressing “Доработать”; selecting a result alone does not open it.
- Child refinements inherit format, style, provider, and model; none of those controls appear in the floating panel.
- Prompt, references, and optional visual markup are sent through the existing refinement API.
- Toolbar and panel remain screen-sized during canvas zoom.
- Desktop uses an anchored floating overlay; narrow screens use a bottom panel.
- A successful submit closes the panel and clears its draft; an error keeps it open.
- No server-side generation records are deleted by the contextual “Удалить” action.

---

### Task 1: Screen-space overlay geometry

**Files:**
- Create: `src/features/canvas/overlay-position.ts`
- Create: `src/features/canvas/overlay-position.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `screenRectForWorldItem(input): ScreenRect`
- Produces: `positionFloatingOverlay(input): { left: number; top: number; placement: "above" | "below" }`
- Consumes: viewport dimensions, pan/zoom transform, world item position and dimensions.

- [ ] **Step 1: Write failing geometry tests**

```ts
test("converts a generation world rect to screen coordinates", () => {
  assert.deepEqual(
    screenRectForWorldItem({
      item: { x: 100, y: 80, width: 760, height: 610 },
      transform: { x: -20, y: 10, scale: 0.5 },
    }),
    { left: 30, top: 50, right: 410, bottom: 355, width: 380, height: 305 },
  );
});

test("places the overlay above when it cannot fit below", () => {
  assert.deepEqual(
    positionFloatingOverlay({
      anchor: { left: 200, top: 300, right: 700, bottom: 700, width: 500, height: 400 },
      viewport: { width: 900, height: 760 },
      overlay: { width: 560, height: 300 },
      margin: 16,
      gap: 12,
    }),
    { left: 170, top: 16, placement: "above" },
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types src/features/canvas/overlay-position.test.ts`

Expected: FAIL because `overlay-position.ts` does not exist.

- [ ] **Step 3: Implement pure geometry helpers**

```ts
export type ScreenRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function screenRectForWorldItem(input: {
  item: { x: number; y: number; width: number; height: number };
  transform: { x: number; y: number; scale: number };
}): ScreenRect {
  const left = input.transform.x + input.item.x * input.transform.scale;
  const top = input.transform.y + input.item.y * input.transform.scale;
  const width = input.item.width * input.transform.scale;
  const height = input.item.height * input.transform.scale;
  return { left, top, width, height, right: left + width, bottom: top + height };
}
```

`positionFloatingOverlay` centers the overlay horizontally on the anchor, clamps it to `margin`, prefers below, otherwise places it above, and clamps the final top edge.

- [ ] **Step 4: Add the focused test to `pnpm test` and verify GREEN**

Run: `pnpm test`

Expected: all tests pass, including the new geometry cases.

- [ ] **Step 5: Commit**

```bash
git add package.json src/features/canvas/overlay-position.ts src/features/canvas/overlay-position.test.ts
git commit -m "feat: add canvas overlay positioning"
```

---

### Task 2: Context toolbar and floating composer

**Files:**
- Create: `src/components/design/generation-context-overlay.tsx`
- Modify: `src/components/design/generation-refinement-composer.tsx`
- Modify: `src/components/design/generation-canvas-card.tsx`

**Interfaces:**
- Produces: `GenerationContextOverlay` with `editorOpen`, `onToggleEditor`, `onDuplicate`, `onRemove`, and `composer`.
- Produces: `GenerationRefinementComposer` with `onClose()` and autofocus behavior.
- Removes: `refinementComposer` from `GenerationCanvasCard`.

- [ ] **Step 1: Add a failing interaction-state test**

Create `src/features/canvas/refinement-overlay-state.test.ts` importing a not-yet-created reducer and assert:

```ts
assert.deepEqual(nextRefinementOverlayState({ editorOpen: false }, "select"), { editorOpen: false });
assert.deepEqual(nextRefinementOverlayState({ editorOpen: false }, "toggle"), { editorOpen: true });
assert.deepEqual(nextRefinementOverlayState({ editorOpen: true }, "close"), { editorOpen: false });
assert.deepEqual(nextRefinementOverlayState({ editorOpen: true }, "submit-success"), { editorOpen: false });
```

Then create `src/features/canvas/refinement-overlay-state.ts` in Step 3 with the exact signature:

```ts
export function nextRefinementOverlayState(
  state: { editorOpen: boolean },
  action: "select" | "toggle" | "close" | "submit-success",
): { editorOpen: boolean }
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types src/features/canvas/refinement-overlay-state.test.ts`

Expected: FAIL because the reducer is missing.

- [ ] **Step 3: Implement contextual actions**

`GenerationContextOverlay` renders:

```tsx
<div className="generation-context-overlay">
  <div className="generation-context-actions" aria-label="Действия с вариантом">
    <button type="button" aria-expanded={editorOpen} onClick={onToggleEditor}>
      <SquarePen /> Доработать
    </button>
    <button type="button" onClick={onDuplicate}>
      <Copy /> Дублировать
    </button>
    <button type="button" onClick={onRemove}>
      <Trash2 /> Удалить
    </button>
  </div>
  {editorOpen ? composer : null}
</div>
```

Stop pointer propagation inside the overlay so toolbar interaction never starts canvas panning.

- [ ] **Step 4: Convert the composer to popover presentation**

Add:

```ts
type Props = {
  // existing properties
  onClose(): void;
};
```

The panel has `role="dialog"`, an accessible title, a close button, prompt autofocus, character count, existing/new reference chips, and the existing submit button. Add an `Escape` listener that calls `onClose` without clearing the draft. On successful `onSubmit`, clear the draft and local files; the workspace closes the panel after `mutateAsync` resolves.

- [ ] **Step 5: Remove the embedded composer from generation cards**

Delete `refinementComposer?: ReactNode`, its prop plumbing, and:

```tsx
{selected && generation.status === "SUCCEEDED" ? refinementComposer : null}
```

The generated card height remains `610`.

- [ ] **Step 6: Run tests, typecheck, and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`

Expected: all commands exit `0`.

- [ ] **Step 7: Commit**

```bash
git add src/components/design/generation-context-overlay.tsx src/components/design/generation-refinement-composer.tsx src/components/design/generation-canvas-card.tsx src/features/canvas/refinement-overlay-state.ts src/features/canvas/refinement-overlay-state.test.ts package.json
git commit -m "feat: add contextual refinement controls"
```

---

### Task 3: Anchor overlay and manage canvas instances

**Files:**
- Modify: `src/components/design/canvas-viewport.tsx`
- Modify: `src/components/design/design-workspace.tsx`

**Interfaces:**
- `CanvasViewport` consumes `selectedGenerationOverlay?: ReactNode`.
- `CanvasGenerationNode` continues to expose `id`, `height`, and `node`.
- `DesignWorkspace` maintains `refinementEditorGenerationId: string | null`.
- Duplicate canvas nodes use `copy:<uuid>` as node IDs and retain the original `generationId`.

- [ ] **Step 1: Render one overlay in `CanvasViewport`**

Find the selected generation index, transform its world rectangle with `screenRectForWorldItem`, and position the overlay with `positionFloatingOverlay`. Render it after `.canvas-world` so it is not affected by the world transform:

```tsx
{selectedGenerationOverlay && selectedGenerationRect ? (
  <div
    className="canvas-generation-overlay"
    style={{ left: overlayPosition.left, top: overlayPosition.top }}
    onPointerDown={(event) => event.stopPropagation()}
  >
    {selectedGenerationOverlay}
  </div>
) : null}
```

Recompute during pan, zoom, resize, selection, and generation wrapping.

- [ ] **Step 2: Introduce canvas instance state**

Represent visible nodes as:

```ts
type GenerationCanvasInstance = {
  nodeId: string;
  generationId: string;
};
```

Base instances use `nodeId === generation.id`. “Дублировать” appends a `copy:<uuid>` instance pointing to the same generation. “Удалить” hides only the selected node ID. Both actions are local canvas operations and do not call a delete API.

- [ ] **Step 3: Build the selected overlay in `DesignWorkspace`**

Resolve the selected canvas instance to its underlying successful generation. Pass `GenerationContextOverlay` only when the result file exists. Toggle `refinementEditorGenerationId` explicitly from “Доработать”; selecting another node closes the previous editor but preserves its localStorage draft.

- [ ] **Step 4: Wire successful and failed submissions**

Pass the underlying `generation.id` to `GenerationRefinementComposer`. Await `createRefinement.mutateAsync`. Close the editor only after success. Keep it open and show the existing mutation error on failure.

- [ ] **Step 5: Preserve visual markup**

The selected result remains the only result mounting `VisualPromptEditor`, and `refinementPromptRef.current.snapshot()` continues to append `overlay` and `canvasState` to the refinement `FormData`.

- [ ] **Step 6: Run checks**

Run: `pnpm test && pnpm typecheck && pnpm lint`

Expected: all commands exit `0`.

- [ ] **Step 7: Commit**

```bash
git add src/components/design/canvas-viewport.tsx src/components/design/design-workspace.tsx src/components/design/workspace-types.ts
git commit -m "feat: anchor refinement editor to canvas selection"
```

---

### Task 4: Responsive styling and end-to-end verification

**Files:**
- Modify: `src/app/globals.css`
- Modify: any component touched above only when verification exposes a concrete defect.

**Interfaces:**
- Desktop overlay width: toolbar up to `640px`, composer up to `560px`.
- Mobile breakpoint: below `768px`, editor becomes a fixed bottom panel with safe-area padding.

- [ ] **Step 1: Add overlay styles**

Add styles for:

```css
.canvas-generation-overlay { position: absolute; z-index: 30; }
.generation-context-actions { display: flex; }
.generation-refinement-popover { width: min(560px, calc(100vw - 32px)); }
```

Use existing surface, border, accent, focus, and shadow tokens. Ensure the action toolbar and panel do not inherit canvas scale.

- [ ] **Step 2: Add responsive bottom-panel behavior**

Below `768px`, pin the overlay to `left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom))`, ignore the desktop `top`, constrain height to the viewport, and enable internal scrolling.

- [ ] **Step 3: Run the full verification suite**

Run:

```bash
pnpm test
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm build
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 4: Verify in the browser**

At desktop and mobile widths:

1. Select a successful generation: toolbar appears but editor remains closed.
2. Click “Доработать”: prompt receives focus.
3. Pan and zoom: toolbar/panel remain readable and follow the selected card.
4. Add and remove references; draft survives closing and reopening.
5. Draw on the selected result and submit: request includes prompt, references, overlay, and canvas state.
6. Trigger an API error: panel stays open and shows the message.
7. Duplicate: a second local canvas instance appears.
8. Delete: only the selected instance disappears.
9. Press `Escape`: panel closes and focus returns to “Доработать”.

- [ ] **Step 5: Commit final styling**

```bash
git add src/app/globals.css
git commit -m "style: polish floating refinement panel"
```
