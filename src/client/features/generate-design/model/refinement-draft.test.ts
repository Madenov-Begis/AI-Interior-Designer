import assert from "node:assert/strict";
import test from "node:test";
import {
  clearRefinementDraft,
  loadRefinementDraft,
  saveRefinementDraft,
} from "./refinement-draft.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("isolates refinement prompts by user and generation", () => {
  const storage = memoryStorage();
  saveRefinementDraft(storage, "user-a", "generation-a", {
    prompt: "Сделай темнее",
    canvasState: null,
  });

  assert.equal(
    loadRefinementDraft(storage, "user-a", "generation-a")?.prompt,
    "Сделай темнее",
  );
  assert.equal(loadRefinementDraft(storage, "user-a", "generation-b"), null);
  assert.equal(loadRefinementDraft(storage, "user-b", "generation-a"), null);
});

test("ignores corrupt draft data and clears a completed draft", () => {
  const storage = memoryStorage();
  storage.setItem("generation-refinement:user-a:generation-a", "{broken");
  assert.equal(loadRefinementDraft(storage, "user-a", "generation-a"), null);

  saveRefinementDraft(storage, "user-a", "generation-a", {
    prompt: "Добавь свет",
    canvasState: null,
  });
  clearRefinementDraft(storage, "user-a", "generation-a");
  assert.equal(loadRefinementDraft(storage, "user-a", "generation-a"), null);
});
