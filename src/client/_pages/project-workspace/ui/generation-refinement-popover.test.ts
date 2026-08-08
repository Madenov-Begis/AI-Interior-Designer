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

test("context actions keep only refinement and removal", () => {
  assert.match(overlaySource, /Доработать/);
  assert.match(overlaySource, /Удалить/);
  assert.doesNotMatch(overlaySource, /Дублировать|onDuplicate|\bCopy\b/);
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
  assert.match(workspaceSource, /generationCardHeight/);
  assert.match(cardSource, /CARD_HEADER_HEIGHT/);
  assert.match(cardSource, /border-b border-border px-5/);
  assert.match(canvasSource, /CARD_HEADER_HEIGHT/);
  assert.match(canvasSource, /border-b border-border px-5/);
  assert.match(canvasSource, /mt-1 text-\[11px\] text-muted/);
  assert.match(canvasSource, /px-3 py-1 text-\[10px\]/);
});

test("inspector drawer closes only when the backdrop is pressed", () => {
  assert.match(inspectorSource, /onPointerDown/);
  assert.match(inspectorSource, /event\.target !== event\.currentTarget/);
  assert.match(inspectorSource, /event\.clientX < bounds\.left/);
  assert.match(inspectorSource, /if \(outsidePanel\) onClose\(\)/);
});
