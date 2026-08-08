export type VisualPromptCanvasState = {
  version: 1;
  coordinateSpace: {
    editorWidth: number;
    editorHeight: number;
    sourceWidth: number;
    sourceHeight: number;
  };
  fabric: Record<string, unknown>;
};

export type VisualPromptTool =
  "select" | "pen" | "marker" | "rectangle" | "eraser";

export type VisualPromptEditorHandle = {
  persist(): Promise<void>;
  markPersisted(used: boolean): void;
  snapshot(): Promise<{
    state: VisualPromptCanvasState;
    overlay: Blob;
  } | null>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  clear(): Promise<void>;
};
