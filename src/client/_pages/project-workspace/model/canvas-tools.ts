import type {
  Canvas,
  FabricObject,
  PencilBrush,
  Rect as FabricRect,
} from "fabric";
import type { EraserBrush } from "@erase2d/fabric";
import type { VisualPromptTool } from "@/features/visual-prompt";

const ERASER_CURSOR = 'url("/cursors/eraser.svg?v=3") 5 24, auto';
export type ErasableFabricObject = FabricObject & { erasable?: boolean };

export function configureCanvasTools(
  canvas: Canvas,
  nextTool: VisualPromptTool,
  nextColor: string,
  nextStrokeWidth: number,
  brushes: { pencil: PencilBrush | null; eraser: EraserBrush | null },
) {
  const isDrawing =
    nextTool === "pen" || nextTool === "marker" || nextTool === "eraser";
  const isSelecting = nextTool === "select";

  canvas.isDrawingMode = isDrawing;
  canvas.selection = isSelecting;
  canvas.skipTargetFind = !isSelecting;
  canvas.defaultCursor =
    nextTool === "eraser"
      ? ERASER_CURSOR
      : nextTool === "rectangle"
        ? "crosshair"
        : isSelecting
          ? "pointer"
          : "default";
  canvas.freeDrawingCursor =
    nextTool === "eraser" ? ERASER_CURSOR : "crosshair";
  canvas.forEachObject((object) => {
    const isEraserStroke =
      object.globalCompositeOperation === "destination-out";
    (object as ErasableFabricObject).erasable = !isEraserStroke;
    object.set({
      selectable: isSelecting && !isEraserStroke,
      evented: isSelecting && !isEraserStroke,
      hoverCursor: isSelecting && !isEraserStroke ? "pointer" : "default",
    });
  });

  if (isDrawing) {
    const brush = nextTool === "eraser" ? brushes.eraser : brushes.pencil;
    if (brush) canvas.freeDrawingBrush = brush;
  }

  if (isDrawing && canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.width = nextStrokeWidth;
    canvas.freeDrawingBrush.color =
      nextTool === "eraser"
        ? "rgba(0, 0, 0, 1)"
        : nextTool === "marker"
          ? `${nextColor}66`
          : nextColor;
  }

  canvas.upperCanvasEl.style.pointerEvents = "auto";
  canvas.wrapperEl.style.touchAction =
    isDrawing || nextTool === "rectangle" ? "none" : "auto";
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

export function bindRectangleTool(
  canvas: Canvas,
  Rect: typeof import("fabric").Rect,
  settings: () => {
    tool: VisualPromptTool;
    color: string;
    strokeWidth: number;
  },
  captureHistory: () => void,
) {
  let rectangle: FabricRect | null = null;
  let rectangleStart: { x: number; y: number } | null = null;
  canvas.on("mouse:down", (event) => {
    if (settings().tool !== "rectangle" || !event.scenePoint) return;

    const start = event.scenePoint;
    rectangleStart = { x: start.x, y: start.y };
    rectangle = new Rect({
      left: start.x,
      top: start.y,
      width: 0,
      height: 0,
      fill: `${settings().color}24`,
      stroke: settings().color,
      strokeWidth: settings().strokeWidth,
      selectable: false,
      evented: false,
      strokeUniform: true,
    });
    canvas?.add(rectangle);
  });
  canvas.on("mouse:move", (event) => {
    const start = rectangleStart;
    const currentRectangle = rectangle;
    if (
      settings().tool !== "rectangle" ||
      !start ||
      !currentRectangle ||
      !event.scenePoint
    ) {
      return;
    }

    const point = event.scenePoint;
    currentRectangle.set({
      left: Math.min(start.x, point.x),
      top: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
    currentRectangle.setCoords();
    canvas?.requestRenderAll();
  });
  canvas.on("mouse:up", () => {
    const currentRectangle = rectangle;
    if (!currentRectangle) return;

    currentRectangle.set({ selectable: false, evented: false });
    rectangle = null;
    rectangleStart = null;
    captureHistory();
  });
  return () => {
    rectangle = null;
    rectangleStart = null;
  };
}
