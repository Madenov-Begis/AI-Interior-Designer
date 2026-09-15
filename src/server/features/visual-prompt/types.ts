export type VisualPromptPlacementRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  kind: "rectangle" | "stroke";
};

type VisualPromptCanvasCoordinateSpace = {
  editorWidth: number;
  editorHeight: number;
  sourceWidth: number;
  sourceHeight: number;
};

export type VisualPromptCanvasStateV1 = {
  version: 1;
  coordinateSpace: VisualPromptCanvasCoordinateSpace;
  fabric: Record<string, unknown>;
};

export type VisualPromptCanvasStateV2 = {
  version: 2;
  coordinateSpace: VisualPromptCanvasCoordinateSpace;
  placementRegions: VisualPromptPlacementRegion[];
  fabric: Record<string, unknown>;
};

export type VisualPromptCanvasState =
  | VisualPromptCanvasStateV1
  | VisualPromptCanvasStateV2;

export type VisualPromptTool = "select" | "pen" | "marker" | "rectangle";

export type VisualPromptEditorHandle = {
  persist(): Promise<void>;
  markPersisted(used: boolean): void;
  snapshot(): Promise<{
    state: VisualPromptCanvasState;
    overlay: Blob;
  } | null>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  deleteSelected(): void;
  clear(): Promise<void>;
};
