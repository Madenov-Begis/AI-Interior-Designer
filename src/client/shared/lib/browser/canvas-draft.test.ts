import assert from "node:assert/strict";
import test from "node:test";
import { CanvasDraftStore } from "./canvas-draft.ts";
import type { ProjectWorkspaceCanvasStateDto as VisualPromptCanvasState } from "../../api/projects/project-workspace.ts";

const state = (objects: unknown[]): VisualPromptCanvasState => ({
  version: 1,
  coordinateSpace: {
    sourceWidth: 1600,
    sourceHeight: 900,
    editorWidth: 800,
    editorHeight: 450,
  },
  fabric: { objects },
});
function storage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}
test("an edit survives disposal before debounce, including clearing the canvas", () => {
  const db = storage();
  const saved = state([{ type: "path" }]);
  const draft = new CanvasDraftStore(db, "user", "project");
  draft.save(state([]), saved);
  assert.deepEqual(
    new CanvasDraftStore(db, "user", "project").read(1600, 900, saved),
    {
      state: state([]),
      conflict: false,
    },
  );
});
test("an old save response cannot clear newer edits", () => {
  const draft = new CanvasDraftStore(storage(), "user", "project");
  const first = state([{ type: "path" }]);
  const next = state([{ type: "rect" }]);
  draft.save(first, null);
  draft.save(next, null);
  draft.acknowledge(first);
  assert.deepEqual(draft.read(1600, 900, null)?.state, next);
  draft.acknowledge(next);
  assert.equal(draft.read(1600, 900, next), null);
});
test("drafts are scoped to the user, project and source dimensions and report server conflicts", () => {
  const db = storage();
  const draft = new CanvasDraftStore(db, "user", "project");
  draft.save(state([]), null);
  assert.equal(
    new CanvasDraftStore(db, "other", "project").read(1600, 900, null),
    null,
  );
  assert.equal(
    new CanvasDraftStore(db, "user", "other").read(1600, 900, null),
    null,
  );
  assert.equal(
    draft.read(1600, 900, state([{ type: "rect" }]))?.conflict,
    true,
  );
  assert.equal(draft.read(1920, 1080, null), null);
});
test("corrupt drafts cannot prevent opening a project", () => {
  const db = storage();
  const draft = new CanvasDraftStore(db, "user", "project");
  db.setItem(draft.key, "{");
  assert.equal(draft.read(1600, 900, null), null);
});
