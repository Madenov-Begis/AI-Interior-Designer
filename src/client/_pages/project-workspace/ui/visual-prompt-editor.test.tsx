import { createRef } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { VisualPromptEditorHandle } from "@/features/visual-prompt";
import { CanvasDraftStore } from "@/shared/lib/browser/canvas-draft";
import type { VisualPromptCanvasState } from "@/features/visual-prompt";
import { VisualPromptEditor } from "./visual-prompt-editor";

const harness = vi.hoisted(() => ({
  canvases: [] as FakeCanvas[],
  api: vi.fn(),
}));
vi.mock("@/features/auth/index.client", () => ({
  useAppSession: () => ({ user: { id: "owner" } }),
}));
vi.mock("@/shared/api", () => ({ apiData: harness.api }));
vi.mock("../model/visual-prompt-canvas-export", () => ({
  canvasToPngBlob: async () => new Blob(["overlay"], { type: "image/png" }),
}));
vi.mock("fabric", () => ({
  Canvas: class {
    objects: Record<string, unknown>[] = [];
    listeners = new Map<string, () => void>();
    wrapperEl = document.createElement("div");
    upperCanvasEl = document.createElement("canvas");
    constructor() {
      harness.canvases.push(this);
    }
    on(name: string, callback: () => void) {
      this.listeners.set(name, callback);
    }
    forEachObject() {}
    discardActiveObject() {}
    requestRenderAll() {}
    getObjects() {
      return this.objects;
    }
    toJSON() {
      return { objects: this.objects };
    }
    async loadFromJSON(state: { objects: Record<string, unknown>[] }) {
      this.objects = state.objects;
    }
    clear() {
      this.objects = [];
    }
    async dispose() {}
  },
  PencilBrush: class {},
  Rect: class {},
  FabricImage: class {},
  util: {},
}));
vi.mock("@erase2d/fabric", () => ({
  EraserBrush: class {
    on() {
      return () => {};
    }
    dispose() {}
  },
}));

type FakeCanvas = {
  upperCanvasEl: HTMLCanvasElement;
  objects: Record<string, unknown>[];
  listeners: Map<string, () => void>;
};
const props = {
  projectId: "project",
  editorWidth: 800,
  editorHeight: 450,
  sourceWidth: 1600,
  sourceHeight: 900,
  initialState: null,
  tool: "select" as const,
  color: "#ffffff",
  strokeWidth: 12,
};
function mountEditor(initialState: VisualPromptCanvasState | null = null) {
  const history = vi.fn();
  const message = vi.fn();
  const ref = createRef<VisualPromptEditorHandle>();
  const view = render(
    <VisualPromptEditor
      {...props}
      initialState={initialState}
      ref={ref}
      onHistoryStateChange={history}
      onPersistenceStateChange={message}
    />,
  );
  return { ...view, ref, history, message };
}
beforeEach(() => {
  localStorage.clear();
  harness.canvases = [];
  harness.api.mockReset().mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("an edit is recoverable after navigating away before the autosave timer", async () => {
  const first = mountEditor();
  await waitFor(() => expect(first.history).toHaveBeenCalled());
  vi.useFakeTimers();
  const canvas = harness.canvases.at(-1)!;
  act(() => {
    canvas.objects = [{ type: "path", stroke: "red" }];
    canvas.listeners.get("object:modified")!();
  });
  expect(localStorage.length).toBe(1);
  first.unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(harness.api).not.toHaveBeenCalled();
  vi.useRealTimers();
  const second = mountEditor();
  await waitFor(() => expect(second.history).toHaveBeenCalled());
  expect(harness.canvases.at(-1)!.objects).toEqual([
    { type: "path", stroke: "red" },
  ]);
  await waitFor(() =>
    expect(harness.api).toHaveBeenCalledWith(
      expect.objectContaining({ method: "PUT" }),
    ),
  );
});

test("failed save retains the draft and reconnect retries it", async () => {
  const editor = mountEditor();
  await waitFor(() => expect(editor.history).toHaveBeenCalled());
  vi.useFakeTimers();
  harness.api.mockRejectedValueOnce(new Error("offline"));
  const canvas = harness.canvases.at(-1)!;
  act(() => {
    canvas.objects = [{ type: "rect" }];
    canvas.listeners.get("object:modified")!();
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(800);
  });
  expect(localStorage.length).toBe(1);
  expect(editor.message).toHaveBeenCalledWith(
    expect.stringContaining("Не удалось сохранить"),
  );
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  expect(harness.api).toHaveBeenCalledTimes(2);
  expect(localStorage.length).toBe(0);
});

test("an acknowledgement for an older generation snapshot retains new canvas edits", async () => {
  const editor = mountEditor();
  await waitFor(() => expect(editor.history).toHaveBeenCalled());
  vi.useFakeTimers();
  const canvas = harness.canvases.at(-1)!;
  act(() => {
    canvas.objects = [{ type: "rect", fill: "new" }];
    canvas.listeners.get("object:modified")!();
  });
  act(() =>
    editor.ref.current!.markPersisted(true, {
      version: 1,
      coordinateSpace: {
        editorWidth: 800,
        editorHeight: 450,
        sourceWidth: 1600,
        sourceHeight: 900,
      },
      fabric: { objects: [{ type: "rect", fill: "old" }] },
    }),
  );
  expect(localStorage.length).toBe(1);
});

test("clearing markup is restored as a server deletion after reload", async () => {
  const saved: VisualPromptCanvasState = {
    version: 1,
    coordinateSpace: {
      editorWidth: 800,
      editorHeight: 450,
      sourceWidth: 1600,
      sourceHeight: 900,
    },
    fabric: { objects: [{ type: "rect" }] },
  };
  new CanvasDraftStore(localStorage, "owner", "project").save(
    { ...saved, fabric: { objects: [] } },
    saved,
  );
  const view = mountEditor(saved);
  await waitFor(() => expect(view.history).toHaveBeenCalled());
  await waitFor(() =>
    expect(harness.api).toHaveBeenCalledWith(
      expect.objectContaining({ method: "DELETE" }),
    ),
  );
  expect(localStorage.length).toBe(0);
});

test("a legacy v1 canvas is upgraded to v2 placement metadata", async () => {
  const saved: VisualPromptCanvasState = {
    version: 1,
    coordinateSpace: {
      editorWidth: 800,
      editorHeight: 450,
      sourceWidth: 1600,
      sourceHeight: 900,
    },
    fabric: { objects: [{ type: "path" }] },
  };

  mountEditor(saved);
  await waitFor(() =>
    expect(harness.api).toHaveBeenCalledWith(
      expect.objectContaining({ method: "PUT" }),
    ),
  );
  const request = harness.api.mock.calls.find(
    ([input]) => input.method === "PUT",
  )?.[0];
  const state = JSON.parse(request.data.get("canvasState"));
  expect(state.version).toBe(2);
  expect(state.placementRegions).toEqual([]);
});

test("a conflicting server version is not silently overwritten on reconnect", async () => {
  const local: VisualPromptCanvasState = {
    version: 1,
    coordinateSpace: {
      editorWidth: 800,
      editorHeight: 450,
      sourceWidth: 1600,
      sourceHeight: 900,
    },
    fabric: { objects: [{ type: "rect", fill: "local" }] },
  };
  new CanvasDraftStore(localStorage, "owner", "project").save(local, null);
  const view = mountEditor({
    ...local,
    fabric: { objects: [{ type: "rect", fill: "server" }] },
  });
  await waitFor(() => expect(view.history).toHaveBeenCalled());
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  expect(harness.api).not.toHaveBeenCalled();
  expect(view.message).toHaveBeenCalledWith(
    expect.stringContaining("на сервере другая версия"),
  );
  expect(localStorage.length).toBe(1);
});

test("a slow save does not block drawing and its response retains newer edits", async () => {
  let finish: () => void = () => undefined;
  harness.api.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const editor = mountEditor();
  await waitFor(() => expect(editor.history).toHaveBeenCalled());
  const canvas = harness.canvases.at(-1)!;
  canvas.objects = [{ type: "rect", fill: "first" }];
  let saving: Promise<void>;
  act(() => {
    saving = editor.ref.current!.persist();
  });
  await waitFor(() => expect(harness.api).toHaveBeenCalledTimes(1));
  expect(canvas.upperCanvasEl.style.pointerEvents).toBe("auto");
  act(() => {
    canvas.objects = [{ type: "rect", fill: "second" }];
    canvas.listeners.get("object:modified")!();
  });
  await act(async () => {
    finish();
    await saving!;
  });
  expect(JSON.stringify(localStorage)).toContain("second");
});
