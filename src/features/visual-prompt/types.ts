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

export type VisualPromptTool = "select" | "pan" | "pen" | "marker" | "rectangle";

export type VisualPromptEditorHandle = {
  persist(): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  deleteSelected(): Promise<void>;
  clear(): Promise<void>;
};
