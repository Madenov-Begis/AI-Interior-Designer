export type RefinementOverlayState = {
  editorOpen: boolean;
};

export type RefinementOverlayAction =
  | "select"
  | "toggle"
  | "close"
  | "submit-success";

export function nextRefinementOverlayState(
  state: RefinementOverlayState,
  action: RefinementOverlayAction,
): RefinementOverlayState {
  if (action === "toggle") {
    return { editorOpen: !state.editorOpen };
  }
  if (action === "select") {
    return state;
  }
  return { editorOpen: false };
}
