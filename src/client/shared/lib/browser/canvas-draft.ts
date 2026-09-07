import type { ProjectWorkspaceCanvasStateDto as VisualPromptCanvasState } from "../../api/projects/project-workspace.ts";

export const CANVAS_DRAFT_PREFIX = "ruvie:canvas-draft:v1:";
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Draft = {
  version: 1;
  base: string;
  state: VisualPromptCanvasState;
  updatedAt?: number;
};

export class CanvasDraftStore {
  readonly key: string;
  private readonly storage: DraftStorage;
  constructor(storage: DraftStorage, userId: string, projectId: string) {
    this.storage = storage;
    this.key = `${CANVAS_DRAFT_PREFIX}${userId}:${projectId}`;
  }

  save(
    state: VisualPromptCanvasState,
    base: VisualPromptCanvasState | null,
    updatedAt = Date.now(),
  ) {
    this.storage.setItem(
      this.key,
      JSON.stringify({
        version: 1,
        updatedAt,
        base: JSON.stringify(base),
        state,
      } satisfies Draft),
    );
  }

  read(
    sourceWidth: number,
    sourceHeight: number,
    serverState: VisualPromptCanvasState | null,
  ) {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    let draft: Draft;
    try {
      draft = JSON.parse(raw);
    } catch {
      this.storage.removeItem(this.key);
      return null;
    }
    const space = draft?.state?.coordinateSpace;
    if (
      draft?.version !== 1 ||
      draft.state?.version !== 1 ||
      typeof draft.base !== "string" ||
      !space ||
      space.sourceWidth !== sourceWidth ||
      space.sourceHeight !== sourceHeight ||
      !Number.isInteger(space.editorWidth) ||
      space.editorWidth <= 0 ||
      space.editorWidth > 6000 ||
      !Number.isInteger(space.editorHeight) ||
      space.editorHeight <= 0 ||
      space.editorHeight > 6000 ||
      !Array.isArray(draft.state.fabric?.objects)
    ) {
      this.storage.removeItem(this.key);
      return null;
    }
    if (JSON.stringify(draft.state) === JSON.stringify(serverState)) {
      this.storage.removeItem(this.key);
      return null;
    }
    return {
      state: draft.state,
      conflict: draft.base !== JSON.stringify(serverState),
    };
  }

  acknowledge(state: VisualPromptCanvasState) {
    const raw = this.storage.getItem(this.key);
    if (!raw) return;
    const draft: Draft = JSON.parse(raw);
    // An older response must never delete newer edits (including another tab).
    if (JSON.stringify(draft.state) === JSON.stringify(state))
      this.storage.removeItem(this.key);
  }
}

export function clearUserCanvasDrafts(storage: Storage, userId: string) {
  const prefix = `${CANVAS_DRAFT_PREFIX}${userId}:`;
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  );
  for (const key of keys) if (key?.startsWith(prefix)) storage.removeItem(key);
}
