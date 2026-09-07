import { afterEach, expect, it, vi } from "vitest";
import { IndexedCanvasDraftStore } from "./indexed-canvas-draft";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

it("restores the synchronous fallback when IndexedDB cannot open", async () => {
  vi.stubGlobal("indexedDB", {
    open() {
      const request = {
        onerror: null as null | (() => void),
        error: new Error("Unavailable"),
      };
      queueMicrotask(() => request.onerror?.());
      return request;
    },
  });
  const state = {
    version: 1 as const,
    coordinateSpace: {
      sourceWidth: 1600,
      sourceHeight: 900,
      editorWidth: 800,
      editorHeight: 450,
    },
    fabric: { objects: [{ type: "path" }] },
  };
  await new IndexedCanvasDraftStore("user", "project").save(state, null);
  await expect(
    new IndexedCanvasDraftStore("user", "project").read(1600, 900, null),
  ).resolves.toEqual({ state, conflict: false });
});
