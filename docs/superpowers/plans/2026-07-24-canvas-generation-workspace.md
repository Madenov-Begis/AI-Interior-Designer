# Canvas Generation Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current three vertically stacked editor sections with one Figma-like canvas, a floating annotation toolbar, a persistent AI inspector, and generation results that appear beside the source image.

**Architecture:** Keep Fabric.js responsible only for source-image annotations and place it inside a DOM-based pan/zoom world containing the source and generation result cards. A client `DesignWorkspace` coordinates inspector state and project-scoped generation polling, while Prisma-backed services remain the only business-data access layer and Supabase remains limited to Auth and Storage.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Fabric.js 7, TanStack Query 5, Prisma 7, Supabase Storage, lucide-react.

## Global Constraints

- Preserve the selected dark theme tokens: `#1b1b1c`, `#232324`, `#29292b`, `#f5f5f1`, `#9c9ca1`, `#363638`, and accent `#afea4d`.
- Business data must be read and written only through Prisma-backed server services; Supabase SDK is limited to Auth and Storage.
- The original source file must never be overwritten.
- Generation always uses the project source image plus the current saved visual prompt; selecting a result must not silently change the source.
- Successful and previous generation results must render beside the source image on the same canvas.
- Desktop uses a persistent 380 px inspector; tablet uses a right drawer; mobile uses a bottom sheet.
- Use real local image assets for style previews and lucide-react for icons; do not create emoji, CSS-art, or handcrafted SVG substitutes.
- Do not add automated test files in this implementation, per the user's current instruction.
- Verify each deliverable with focused static checks and manual browser interaction.

---

### Task 1: Curated style catalog and server-side prompt composition

**Files:**
- Create: `src/features/generations/interior-styles.ts`
- Create: `public/images/interior-styles/modern.webp`
- Create: `public/images/interior-styles/japandi.webp`
- Create: `public/images/interior-styles/minimalism.webp`
- Create: `public/images/interior-styles/neoclassic.webp`
- Create: `public/images/interior-styles/loft.webp`
- Create: `public/images/interior-styles/scandinavian.webp`
- Modify: `src/features/generations/schema.ts`
- Modify: `src/features/generations/prompt.ts`
- Modify: `src/features/generations/reservation.ts`
- Modify: `src/app/api/v1/config/route.ts`

**Interfaces:**
- Produces: `INTERIOR_STYLES`, `INTERIOR_STYLE_CODES`, `InteriorStyleCode`, and `getInteriorStyle(code)`.
- Changes: `buildFinalPrompt(input)` accepts `stylePrompt?: string`.
- Changes: `reserveGeneration(input)` accepts `styleCode?: InteriorStyleCode`.
- Produces: `GET /api/v1/config` field `interiorStyles`.

- [ ] **Step 1: Create six real preview assets**

Generate six independent 4:3 photorealistic room previews at a consistent camera angle, neutral daylight, and premium editorial quality. Each image must clearly represent its named style without text, logos, borders, or UI. Optimize each output to 640×480 WebP and place it at the exact path listed above.

Run:

```bash
file public/images/interior-styles/*.webp
```

Expected: six WebP files, each 640×480.

- [ ] **Step 2: Add the typed allowlisted style catalog**

Create `src/features/generations/interior-styles.ts` with this public shape:

```ts
export const INTERIOR_STYLE_CODES = [
  "modern",
  "japandi",
  "minimalism",
  "neoclassic",
  "loft",
  "scandinavian",
] as const;

export type InteriorStyleCode = (typeof INTERIOR_STYLE_CODES)[number];

export const INTERIOR_STYLES = [
  {
    code: "modern",
    name: "Современный",
    imageUrl: "/images/interior-styles/modern.webp",
    promptModifier:
      "Стиль: современный интерьер с чистыми линиями, функциональной мебелью, спокойной нейтральной палитрой и лаконичными деталями.",
  },
  {
    code: "japandi",
    name: "Джапанди",
    imageUrl: "/images/interior-styles/japandi.webp",
    promptModifier:
      "Стиль: джапанди с натуральным деревом, тёплыми нейтральными оттенками, низкой мебелью и спокойной минималистичной композицией.",
  },
  {
    code: "minimalism",
    name: "Минимализм",
    imageUrl: "/images/interior-styles/minimalism.webp",
    promptModifier:
      "Стиль: минимализм с простыми формами, свободным пространством, скрытым хранением и ограниченной светлой палитрой.",
  },
  {
    code: "neoclassic",
    name: "Неоклассика",
    imageUrl: "/images/interior-styles/neoclassic.webp",
    promptModifier:
      "Стиль: современная неоклассика с симметрией, деликатными молдингами, благородными материалами и сдержанной элегантностью.",
  },
  {
    code: "loft",
    name: "Лофт",
    imageUrl: "/images/interior-styles/loft.webp",
    promptModifier:
      "Стиль: лофт с фактурным кирпичом или бетоном, металлом, тёмными акцентами и открытыми выразительными материалами.",
  },
  {
    code: "scandinavian",
    name: "Скандинавский",
    imageUrl: "/images/interior-styles/scandinavian.webp",
    promptModifier:
      "Стиль: скандинавский интерьер со светлым деревом, мягким естественным светом, практичной мебелью и уютным текстилем.",
  },
] as const satisfies ReadonlyArray<{
  code: InteriorStyleCode;
  name: string;
  imageUrl: string;
  promptModifier: string;
}>;

export function getInteriorStyle(code: InteriorStyleCode | undefined) {
  return code ? INTERIOR_STYLES.find((style) => style.code === code) : undefined;
}
```

- [ ] **Step 3: Validate the style code and compose it only on the server**

Extend `createGenerationSchema`:

```ts
styleCode: z.enum(INTERIOR_STYLE_CODES).optional(),
```

Extend `buildFinalPrompt`:

```ts
export function buildFinalPrompt(input: {
  prompt: string;
  visualPromptUsed: boolean;
  referenceCount: number;
  stylePrompt?: string;
}) {
  const parts = [
    "Создай фотореалистичный редизайн интерьера по исходной фотографии.",
    "Строго сохрани ракурс камеры, геометрию помещения, стены, окна, двери и пропорции.",
    input.prompt.trim(),
  ];
  if (input.stylePrompt) parts.push(input.stylePrompt);
  if (input.visualPromptUsed) {
    parts.push("Учитывай цветную визуальную разметку как указание зон, которые требуется изменить.");
  }
  if (input.referenceCount > 0) {
    parts.push(`Используй ${input.referenceCount} референсов в переданном порядке для стиля, материалов, мебели и декора.`);
  }
  parts.push("Не добавляй текст, логотипы и водяные знаки в AI-изображение.");
  return parts.join("\n\n");
}
```

In `reserveGeneration`, resolve the allowlisted catalog entry and pass only its server-owned `promptModifier` to `buildFinalPrompt`.

- [ ] **Step 4: Expose safe style metadata in application config**

Return only `code`, `name`, and `imageUrl` from `GET /api/v1/config`:

```ts
interiorStyles: INTERIOR_STYLES.map(({ code, name, imageUrl }) => ({
  code,
  name,
  imageUrl,
})),
```

Do not return `promptModifier` to the client.

- [ ] **Step 5: Verify and commit the style catalog**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: both commands exit 0.

Commit:

```bash
git add public/images/interior-styles src/features/generations src/app/api/v1/config/route.ts
git commit -m "feat: add curated interior style presets"
```

---

### Task 2: Workspace data contract and page composition

**Files:**
- Create: `src/components/design/workspace-types.ts`
- Create: `src/components/design/design-workspace.tsx`
- Create: `src/components/design/workspace-header.tsx`
- Modify: `src/features/generations/service.ts`
- Modify: `src/app/app/design/[id]/page.tsx`
- Modify: `src/app/api/v1/generations/route.ts`
- Delete after replacement: `src/components/design/generation-panel.tsx`

**Interfaces:**
- Produces: `WorkspaceGeneration`, `WorkspaceReference`, and `DesignWorkspaceProps`.
- Changes: `listOwnedGenerations()` returns `errorMessage`, `createdAt`, and the existing model/result metadata required by canvas cards.
- Produces: `DesignWorkspace(props: DesignWorkspaceProps)`.
- Consumes: existing signed source/reference URLs and `VisualPromptCanvasState`.

- [ ] **Step 1: Define a single serializable workspace contract**

Create `src/components/design/workspace-types.ts`:

```ts
import type { VisualPromptCanvasState } from "@/features/visual-prompt/types";

export type WorkspaceGenerationStatus =
  | "QUEUED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REJECTED";

export type WorkspaceGeneration = {
  id: string;
  status: WorkspaceGenerationStatus;
  prompt: string;
  aspectRatio: string;
  resultUserId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  model: { code: string; name: string };
};

export type WorkspaceReference = {
  id: string;
  fileId: string;
  position: number;
  sourceUrl: string | null;
  previewUrl: string;
};

export type DesignWorkspaceProps = {
  project: {
    id: string;
    name: string;
    prompt: string | null;
    aspectRatio: string;
    sourceUrl: string;
    sourceWidth: number;
    sourceHeight: number;
    initialCanvasState: VisualPromptCanvasState | null;
  };
  initialReferences: WorkspaceReference[];
};
```

- [ ] **Step 2: Expand project-scoped generation list output**

Add `errorMessage` and `createdAt` to the Prisma `select` in `listOwnedGenerations`. Preserve ownership filtering through `userId` and `projectId`.

Use the existing endpoint from the client:

```text
GET /api/v1/generations?projectId={projectId}&limit=20
```

No client-supplied `userId` is accepted.

- [ ] **Step 3: Create the workspace orchestrator shell**

Create `DesignWorkspace` as a client component with these top-level responsibilities only:

```ts
export function DesignWorkspace({
  project,
  initialReferences,
}: DesignWorkspaceProps) {
  // controlled prompt/model/aspect/style state
  // project-scoped generation query and create/cancel mutations
  // selected canvas item
  // refs connecting toolbar and inspector to the visual prompt layer
  // composition of WorkspaceHeader, CanvasViewport, and DesignInspector
}
```

Keep Fabric manipulation, pan/zoom math, reference upload, and result actions in focused child components from later tasks.

- [ ] **Step 4: Add the compact workspace header**

Create `WorkspaceHeader` with back navigation, editable project name, save state, undo/redo actions, history link, and user profile affordance. Save name changes through the existing owner-checked project PATCH endpoint after blur:

```ts
await fetch(`/api/v1/projects/${projectId}`, {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: nextName.trim() }),
});
```

Reject blank names locally and restore the last server-confirmed value on request failure.

- [ ] **Step 5: Replace the stacked page with one viewport-height workspace**

In `src/app/app/design/[id]/page.tsx`, keep server authentication, Prisma project loading, and Storage signed URL creation. Replace the three stacked components with:

```tsx
<main className="h-dvh overflow-hidden bg-background text-foreground">
  <DesignWorkspace
    project={{
      id: project.id,
      name: project.name,
      prompt: project.prompt,
      aspectRatio: project.aspectRatio,
      sourceUrl: signed.data.signedUrl,
      sourceWidth: project.sourceImage.width ?? project.sourcePreview.width ?? 1600,
      sourceHeight: project.sourceImage.height ?? project.sourcePreview.height ?? 900,
      initialCanvasState: (project.canvasState as VisualPromptCanvasState | null) ?? null,
    }}
    initialReferences={referenceUrls}
  />
</main>
```

- [ ] **Step 6: Verify the workspace shell and commit**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: exit 0; the project page renders the new shell without importing the old `GenerationPanel`.

Commit:

```bash
git add src/app/app/design src/app/api/v1/generations/route.ts src/components/design src/features/generations/service.ts
git commit -m "refactor: compose design project as one workspace"
```

---

### Task 3: Pan/zoom canvas and external annotation toolbar

**Files:**
- Create: `src/components/design/canvas-viewport.tsx`
- Create: `src/components/design/workspace-toolbar.tsx`
- Modify: `src/components/design/visual-prompt-editor.tsx`
- Modify: `src/features/visual-prompt/types.ts`
- Modify: `src/app/globals.css`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `VisualPromptEditorHandle.persist(): Promise<void>`.
- Produces: `VisualPromptEditorHandle.undo()`, `redo()`, `deleteSelected()`, and `clear()`.
- Changes: `VisualPromptEditor` consumes controlled `tool`, `color`, and `strokeWidth`.
- Produces: `CanvasViewport` props for source, generations, selected item, toolbar state, and result selection.

- [ ] **Step 1: Install the icon dependency**

Run:

```bash
pnpm add lucide-react
```

Expected: `lucide-react` is added to `dependencies` and `pnpm-lock.yaml` changes.

- [ ] **Step 2: Extend visual prompt tool types**

Keep the TЗ tools and add pan as a workspace mode:

```ts
export type VisualPromptTool = "select" | "pan" | "pen" | "marker" | "rectangle";

export type VisualPromptEditorHandle = {
  persist(): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  deleteSelected(): void;
  clear(): void;
};
```

`pan` must disable Fabric selection and drawing; it delegates pointer movement to `CanvasViewport`.

- [ ] **Step 3: Refactor Fabric into a transparent controlled layer**

Make `VisualPromptEditor` render only the image-sized transparent canvas. Move its existing visible toolbar, color controls, save card, and explanatory panel out of the component.

Expose this ref:

```tsx
export const VisualPromptEditor = forwardRef<VisualPromptEditorHandle, Props>(
  function VisualPromptEditor(props, ref) {
    useImperativeHandle(ref, () => ({
      persist,
      undo,
      redo,
      deleteSelected,
      clear,
    }));
    return <canvas ref={canvasElementRef} aria-label="Разметка исходной фотографии" />;
  },
);
```

Add `onHistoryStateChange(state: { canUndo: boolean; canRedo: boolean }): void` to the editor props and emit it whenever the history index changes. This is the only source for toolbar undo/redo disabled state.

`persist()` must:

- save Fabric JSON and flattened transparent PNG when objects exist;
- call `DELETE /visual-prompt` when no objects exist but a saved visual prompt must be cleared;
- throw an `Error` on failure so generation does not start;
- resolve without showing a separate step-completion message.

- [ ] **Step 4: Implement bounded DOM pan and zoom**

Create `CanvasViewport` with world transform state:

```ts
type ViewportTransform = { x: number; y: number; scale: number };
const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;
```

Use pointer capture for mouse/touch pan and normalize wheel zoom around the pointer. Provide `zoomIn`, `zoomOut`, and `fitToContent`. Ignore pan gestures while a drawing tool is active over the source image.

Lay out world items with deterministic positions:

```ts
const SOURCE_X = 80;
const SOURCE_Y = 80;
const CARD_WIDTH = 760;
const CARD_GAP = 72;

function generationPosition(index: number) {
  return {
    x: SOURCE_X + (index + 1) * (CARD_WIDTH + CARD_GAP),
    y: SOURCE_Y,
  };
}
```

Allow wrapping after measuring available world width only if more than four results are visible.

- [ ] **Step 5: Add the floating toolbar and zoom controls**

Use lucide-react icons with tooltips and explicit `aria-label`. The toolbar consumes controlled state:

```ts
type WorkspaceToolbarProps = {
  tool: VisualPromptTool;
  color: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange(tool: VisualPromptTool): void;
  onColorChange(color: string): void;
  onStrokeWidthChange(width: number): void;
  onUndo(): void;
  onRedo(): void;
  onDelete(): void;
  onClear(): void;
};
```

Put color and thickness in a compact popover shown for pen, marker, and rectangle.

- [ ] **Step 6: Add canvas-specific CSS**

Add classes for the dotted world background, selected item ring, responsive toolbar orientation, reduced motion, and touch behavior. Preserve:

```css
.visual-prompt-canvas {
  touch-action: none;
}
```

Use `touch-action: none` on the viewport only while pan mode is active; drawing mode applies it only to the source annotation layer.

- [ ] **Step 7: Verify canvas interaction and commit**

Run:

```bash
pnpm typecheck
pnpm lint
```

Manual browser checks:

1. wheel zoom remains centered under the pointer;
2. pan works with mouse drag and touch;
3. pen, marker, rectangle, select, undo, redo, delete, and clear work;
4. annotations remain aligned after zoom and fit-to-screen;
5. reloading restores saved annotation coordinates.

Commit:

```bash
git add package.json pnpm-lock.yaml src/components/design/canvas-viewport.tsx src/components/design/workspace-toolbar.tsx src/components/design/visual-prompt-editor.tsx src/features/visual-prompt/types.ts src/app/globals.css
git commit -m "feat: add pan zoom design canvas"
```

---

### Task 4: Persistent AI inspector

**Files:**
- Create: `src/components/design/design-inspector.tsx`
- Create: `src/components/design/style-picker.tsx`
- Modify: `src/components/design/reference-manager.tsx`
- Modify: `src/components/design/design-workspace.tsx`

**Interfaces:**
- Produces: `DesignInspector` controlled props for prompt, style, model, aspect ratio, usage, and generation action.
- Produces: `StylePicker` consuming safe config metadata.
- Changes: `ReferenceManager` supports `variant="compact"` and keeps its current Prisma-backed endpoints.

- [ ] **Step 1: Convert references to the compact inspector presentation**

Add:

```ts
type Props = {
  projectId: string;
  initialReferences: ReferenceItem[];
  maxCount?: number;
  variant?: "section" | "compact";
};
```

For `compact`, remove the outer large section, step label, and five-column grid. Render a horizontal thumbnail strip with a dashed add tile. Put «Файлы» and «Ссылка» inside the add popover. Preserve upload, URL import, ordering, deletion, count limits, signed URLs, and partial-import error messages.

- [ ] **Step 2: Build the style picker**

Render the safe config entries as an accessible horizontal radio group:

```ts
type StylePickerProps = {
  styles: Array<{ code: string; name: string; imageUrl: string }>;
  value: string | undefined;
  onChange(value: string | undefined): void;
};
```

Clicking the active style a second time clears it. Use native `<img>` with fixed 4:3 crop and show selection with a check icon plus border, not color alone.

- [ ] **Step 3: Build the inspector hierarchy**

`DesignInspector` must render in this exact order:

1. compact references;
2. textarea «Что изменить?» with `3–4000` validation and counter;
3. style picker;
4. collapsed settings disclosure containing model and aspect ratio;
5. usage summary, disabled explanation, and primary generation button.

Use the existing `/api/v1/models` and `/api/v1/usage/today` queries. Only render aspect ratios included in the selected model's `supportedAspectRatios`.

- [ ] **Step 4: Wire responsive inspector modes**

Use one inspector component in three containers:

- desktop: fixed 380 px right column;
- tablet: modal right drawer controlled by «AI-настройки»;
- mobile: bottom sheet with a visible close button and focus restoration.

Closing the drawer/sheet must not reset prompt, style, references, model, or aspect ratio.

- [ ] **Step 5: Verify inspector behavior and commit**

Run:

```bash
pnpm typecheck
pnpm lint
```

Manual browser checks:

1. file and URL references can be added and removed;
2. style selection does not overwrite textarea text;
3. model and format remain available under settings;
4. generation button explains every disabled state;
5. inspector state survives drawer close/open.

Commit:

```bash
git add src/components/design/design-inspector.tsx src/components/design/style-picker.tsx src/components/design/reference-manager.tsx src/components/design/design-workspace.tsx
git commit -m "feat: add canvas generation inspector"
```

---

### Task 5: Generation placeholders, results, compare, and download

**Files:**
- Create: `src/components/design/generation-canvas-card.tsx`
- Create: `src/components/design/result-actions.tsx`
- Modify: `src/components/design/design-workspace.tsx`
- Modify: `src/components/design/canvas-viewport.tsx`
- Modify: `src/features/generations/service.ts`

**Interfaces:**
- Produces: `GenerationCanvasCard` for all generation statuses.
- Produces: `ResultActions` using existing `BeforeAfter`.
- Consumes: `POST /api/v1/generations`, project-scoped generation list, cancel route, media signed URL route, and protected download route.

- [ ] **Step 1: Poll the project-scoped generation collection**

In `DesignWorkspace`, use one list query:

```ts
useQuery({
  queryKey: ["generations", project.id],
  queryFn: () =>
    readJson(fetch(`/api/v1/generations?projectId=${project.id}&limit=20`)),
  refetchInterval: (query) =>
    query.state.data?.items.some((item) =>
      item.status === "QUEUED" || item.status === "PROCESSING"
    )
      ? 1500
      : false,
});
```

Sort oldest-to-newest for canvas placement while preserving newest-first service pagination.

- [ ] **Step 2: Persist annotations before reservation**

The create mutation must execute in this order:

```ts
await visualPromptRef.current?.persist();

const response = await fetch("/api/v1/generations", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "idempotency-key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    projectId: project.id,
    prompt,
    styleCode,
    modelCode: selectedModelCode,
    aspectRatio,
  }),
});
```

Only invalidate the generation list and usage queries after a successful reservation. Surface visual-prompt save errors without sending the generation request.

- [ ] **Step 3: Render truthful status cards on the canvas**

`GenerationCanvasCard` states:

- `QUEUED`: spinner, «В очереди», cancel action;
- `PROCESSING`: spinner, «AI создаёт интерьер»;
- `SUCCEEDED`: signed result image and «Вариант N»;
- `FAILED`: `errorMessage` and retry action;
- `REJECTED`: safety rejection message and retry action;
- `CANCELLED`: cancelled label and close/remove-from-view action.

Do not display fabricated percentages. Fetch `/api/v1/media/{resultUserId}/signed-url` only when `status === "SUCCEEDED"`.

- [ ] **Step 4: Add selected-result actions**

Create `ResultActions` with:

```ts
type ResultActionsProps = {
  generation: WorkspaceGeneration;
  sourceUrl: string;
  resultUrl: string;
  onClose(): void;
  onGenerateVariation(): void;
};
```

Render:

- modal/drawer with existing `<BeforeAfter beforeUrl={sourceUrl} afterUrl={resultUrl} />`;
- protected download link `/api/v1/generations/{id}/download`;
- «Создать ещё вариант» using current inspector state;
- model, format, prompt, and creation date details.

- [ ] **Step 5: Restore previous results on reload**

Use the first project-scoped query response as the canvas generation source. Do not store result positions in local storage or Prisma. Assign `Вариант N` by ascending creation time so labels are stable across reloads.

- [ ] **Step 6: Verify the complete generation flow and commit**

Run:

```bash
pnpm typecheck
pnpm lint
```

Manual browser checks with a real project:

1. drawing followed by generation saves the latest overlay first;
2. exactly one queued card appears;
3. status changes without page navigation;
4. success replaces the placeholder with the generated image;
5. compare and download work;
6. reload restores previous successful results;
7. the source and its annotations remain unchanged.

Commit:

```bash
git add src/components/design src/features/generations/service.ts
git commit -m "feat: show generation results on the design canvas"
```

---

### Task 6: Responsive polish, accessibility, and final verification

**Files:**
- Modify: `src/components/design/design-workspace.tsx`
- Modify: `src/components/design/canvas-viewport.tsx`
- Modify: `src/components/design/workspace-toolbar.tsx`
- Modify: `src/components/design/design-inspector.tsx`
- Modify: `src/components/design/generation-canvas-card.tsx`
- Modify: `src/components/design/result-actions.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Finalizes the selected desktop visual target and its tablet/mobile adaptations.
- Does not introduce new API or database contracts.

- [ ] **Step 1: Match the approved desktop composition**

At 1440×1024 verify:

- top bar remains compact;
- source image is the visual focus;
- floating toolbar does not cover the source content;
- inspector width is 380 px;
- the primary button remains visible after normal inspector scrolling;
- canvas controls remain above browser-safe insets.

- [ ] **Step 2: Finish tablet and mobile interaction**

At 1024×768 and 390×844 verify:

- drawer/sheet has backdrop, close action, and scroll containment;
- horizontal toolbar controls are at least 44×44 px;
- pan and draw modes cannot activate simultaneously;
- pinch/drag does not scroll the page unexpectedly;
- result cards can be brought into view with fit-to-content.

- [ ] **Step 3: Complete accessibility states**

Ensure:

- every icon button has `aria-label`;
- tool and style selection use `aria-pressed` or radio semantics;
- drawers and result dialogs trap focus and restore it;
- error/status messages use appropriate `aria-live`;
- visible focus is preserved;
- reduced-motion removes decorative transitions.

- [ ] **Step 4: Run full repository verification**

Run:

```bash
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all four commands exit 0.

- [ ] **Step 5: Run manual browser acceptance**

Start:

```bash
pnpm dev
```

Verify the complete authenticated flow at desktop, tablet, and mobile widths:

1. open project;
2. pan and zoom;
3. draw and undo;
4. add a reference;
5. choose a style;
6. generate;
7. observe result on canvas;
8. compare and download;
9. reload and confirm restoration.

Capture final screenshots at 1440×1024, 1024×768, and 390×844 and compare the desktop screenshot against the approved option №1 for hierarchy, spacing, palette, and control placement.

- [ ] **Step 6: Commit final polish**

```bash
git add src/app/globals.css src/components/design
git commit -m "feat: finish responsive canvas workspace"
```
