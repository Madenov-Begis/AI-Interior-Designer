import type { VisualPromptCanvasState } from "../../visual-prompt/index.ts";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type RefinementDraft = {
  prompt: string;
  canvasState: VisualPromptCanvasState | null;
};

function draftKey(userScope: string, generationId: string) {
  return `generation-refinement:${userScope}:${generationId}`;
}

export function loadRefinementDraft(
  storage: DraftStorage,
  userScope: string,
  generationId: string,
): RefinementDraft | null {
  try {
    const value = storage.getItem(draftKey(userScope, generationId));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<RefinementDraft>;
    if (typeof parsed.prompt !== "string") return null;
    return {
      prompt: parsed.prompt,
      canvasState: parsed.canvasState ?? null,
    };
  } catch {
    return null;
  }
}

export function saveRefinementDraft(
  storage: DraftStorage,
  userScope: string,
  generationId: string,
  draft: RefinementDraft,
) {
  storage.setItem(draftKey(userScope, generationId), JSON.stringify(draft));
}

export function clearRefinementDraft(
  storage: DraftStorage,
  userScope: string,
  generationId: string,
) {
  storage.removeItem(draftKey(userScope, generationId));
}
