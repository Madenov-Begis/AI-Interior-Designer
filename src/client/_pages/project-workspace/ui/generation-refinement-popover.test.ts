import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./generation-refinement-composer.tsx", import.meta.url),
  "utf8",
);
const overlaySource = readFileSync(
  new URL("./generation-context-overlay.tsx", import.meta.url),
  "utf8",
);
const workspaceSource = readFileSync(
  new URL("./design-workspace.tsx", import.meta.url),
  "utf8",
);
const generationActionsSource = readFileSync(
  new URL("../model/workspace-generation-actions.ts", import.meta.url),
  "utf8",
);
const generationApiSource = readFileSync(
  new URL("../api/workspace-generations.ts", import.meta.url),
  "utf8",
);
const cardSource = readFileSync(
  new URL("./generation-canvas-card.tsx", import.meta.url),
  "utf8",
);
const inspectorSource = readFileSync(
  new URL("./workspace-inspector-panel.tsx", import.meta.url),
  "utf8",
);
const canvasSource = readFileSync(
  new URL("./canvas-viewport.tsx", import.meta.url),
  "utf8",
);
const toolbarSource = readFileSync(
  new URL("./workspace-toolbar.tsx", import.meta.url),
  "utf8",
);
const globalStylesSource = readFileSync(
  new URL("../../../../app/globals.css", import.meta.url),
  "utf8",
);
const visualPromptEditorSource = readFileSync(
  new URL("./visual-prompt-editor.tsx", import.meta.url),
  "utf8",
);
const generationRouteSource = readFileSync(
  new URL("../../../../app/api/v1/generations/[id]/route.ts", import.meta.url),
  "utf8",
);

test("refinement editor uses a controlled modal dialog", () => {
  assert.match(source, /<Dialog/);
  assert.match(source, /<DialogContent/);
  assert.match(source, /onOpenChange/);
  assert.match(source, /generation-refinement-dialog/);
});

test("refinement dialog closes through the primitive and keeps prompt autofocus", () => {
  assert.match(source, /onEscapeKeyDown/);
  assert.match(source, /onPointerDownOutside/);
  assert.match(source, /onOpenAutoFocus/);
  assert.match(source, /promptRef\.current\?\.focus\(\)/);
});

test("context actions dismiss on an outside pointer interaction", () => {
  assert.match(overlaySource, /dismissOnOutsidePointerDown/);
  assert.match(overlaySource, /overlayRef\.current\?\.contains/);
  assert.match(
    overlaySource,
    /document\.addEventListener\([\s\S]*"pointerdown"/,
  );
});

test("drawing settings use a dismissable popover", () => {
  assert.match(toolbarSource, /<Popover open=\{settingsOpen\}/);
  assert.match(toolbarSource, /onOpenChange=\{setSettingsOpen\}/);
  assert.match(toolbarSource, /<PopoverTrigger asChild>/);
  assert.match(toolbarSource, /<PopoverContent/);
  assert.doesNotMatch(toolbarSource, /workspace-toolbar__popover/);
});

test("context actions keep refinement without generation removal", () => {
  assert.match(overlaySource, /Доработать/);
  assert.doesNotMatch(
    overlaySource,
    /Удалить|onRemove|Дублировать|onDuplicate|\bCopy\b/,
  );
  assert.doesNotMatch(cardSource, /Убрать с холста|onRemove/);
  assert.doesNotMatch(generationRouteSource, /export async function DELETE/);
});

test("eraser uses the Fabric 7 compatible erasing brush", () => {
  assert.match(toolbarSource, /id: "eraser"/);
  assert.match(toolbarSource, /Стирать разметку/);
  assert.match(visualPromptEditorSource, /nextTool === "eraser"/);
  assert.match(visualPromptEditorSource, /freeDrawingCursor/);
  assert.match(visualPromptEditorSource, /cursors\/eraser\.svg/);
  assert.match(visualPromptEditorSource, /new EraserBrush\(canvas\)/);
  assert.match(visualPromptEditorSource, /await eraserBrush\.commit/);
});

test("trash clears all markup without a browser confirmation", () => {
  assert.match(toolbarSource, /label="Удалить всю разметку"/);
  assert.match(workspaceSource, /clearCurrentVisualPrompt/);
  assert.match(workspaceSource, /await editor\.clear\(\)/);
  assert.match(visualPromptEditorSource, /canvas\.clear\(\)/);
  assert.doesNotMatch(workspaceSource, /window\.confirm/);
});

test("source markup is saved after canvas history changes", () => {
  assert.match(visualPromptEditorSource, /const schedulePersist = useCallback/);
  assert.match(visualPromptEditorSource, /if \(persistChange\) schedulePersist\(\)/);
  assert.match(visualPromptEditorSource, /persistLatestRef\.current\(\)/);
  assert.match(visualPromptEditorSource, /captureHistory\(false, false\)/);
});

test("refinement sends only new files for the selected generation", () => {
  assert.match(
    generationApiSource,
    /url: `\/generations\/\$\{generationId\}\/refinements`/,
  );
  assert.match(generationActionsSource, /input\.files\.forEach/);
  assert.match(generationActionsSource, /input\.idempotencyKey/);
  assert.doesNotMatch(
    `${workspaceSource}\n${generationActionsSource}\n${generationApiSource}`,
    /initialReferenceFileIds/,
  );
  assert.doesNotMatch(source, /initialReferenceFileIds|referenceFileIds/);
});

test("root generation resolves the source format before creating a request", () => {
  assert.match(workspaceSource, /resolveGenerationAspectRatio/);
  assert.match(workspaceSource, /aspectRatio: resolvedAspectRatio/);
  assert.match(
    generationActionsSource,
    /body\.set\("aspectRatio", aspectRatio\)/,
  );
  assert.doesNotMatch(generationActionsSource, /"SOURCE"/);
});

test("source and result card headers share their height and spacing", () => {
  assert.match(
    canvasSource,
    /canvasCardHeight\(source\.width, source\.height\)/,
  );
  assert.match(
    canvasSource,
    /generationHeights: generations\.map\(\(\) => sourceCardHeight\)/,
  );
  assert.match(canvasSource, /height: sourceCardHeight/);
  assert.match(cardSource, /CARD_HEADER_HEIGHT/);
  assert.match(cardSource, /border-b border-border px-5/);
  assert.match(canvasSource, /CARD_HEADER_HEIGHT/);
  assert.match(canvasSource, /border-b border-border px-5/);
  assert.match(canvasSource, /mt-1 text-xs text-muted-foreground/);
  assert.match(cardSource, /mt-1 text-xs text-muted-foreground/);
  assert.match(canvasSource, /text-xs.*text-muted-foreground/);
  assert.match(cardSource, /text-xs.*text-muted-foreground/);
  assert.match(cardSource, /containedMediaRect/);
  assert.match(cardSource, /object-contain/);
  assert.match(cardSource, /loading=\{selected \? "eager" : "lazy"\}/);
  assert.doesNotMatch(cardSource, /absolute right-4 bottom-4/);
});

test("inspector drawer closes only when the backdrop is pressed", () => {
  assert.match(inspectorSource, /onPointerDown/);
  assert.match(inspectorSource, /event\.target !== event\.currentTarget/);
  assert.match(inspectorSource, /event\.clientX < bounds\.left/);
  assert.match(inspectorSource, /if \(outsidePanel\) onClose\(\)/);
});

test("mobile inspector has an explicit Escape fallback", () => {
  assert.match(inspectorSource, /onKeyDown/);
  assert.match(inspectorSource, /event\.key === "Escape"/);
  assert.match(inspectorSource, /event\.preventDefault\(\)/);
  assert.match(inspectorSource, /onClose\(\)/);
});

test("mobile workspace toolbar keeps 44px touch targets", () => {
  assert.match(
    globalStylesSource,
    /\.workspace-toolbar__button\s*\{[\s\S]*flex: 0 0 2\.75rem;[\s\S]*width: 2\.75rem;[\s\S]*height: 2\.75rem;/,
  );
});
