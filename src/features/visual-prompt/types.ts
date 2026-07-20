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

export type VisualPromptTool = "select" | "pen" | "marker" | "rectangle";
