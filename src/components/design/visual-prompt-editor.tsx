"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { Canvas, Rect as FabricRect } from "fabric";
import type {
  VisualPromptCanvasState,
  VisualPromptEditorHandle,
  VisualPromptTool,
} from "@/features/visual-prompt/types";

type Props = {
  projectId: string;
  editorWidth: number;
  editorHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  initialState: VisualPromptCanvasState | null;
  tool: VisualPromptTool;
  color: string;
  strokeWidth: number;
  onHistoryStateChange(state: { canUndo: boolean; canRedo: boolean }): void;
};

function dataUrlToBlob(dataUrl: string) {
  return fetch(dataUrl).then((response) => response.blob());
}

async function responseError(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    return payload.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export const VisualPromptEditor = forwardRef<VisualPromptEditorHandle, Props>(
  function VisualPromptEditor(props, ref) {
    const canvasElementRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = useRef<Canvas | null>(null);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const loadingHistoryRef = useRef(false);
    const rectangleRef = useRef<FabricRect | null>(null);
    const rectangleStartRef = useRef<{ x: number; y: number } | null>(null);
    const toolRef = useRef<VisualPromptTool>(props.tool);
    const colorRef = useRef(props.color);
    const strokeWidthRef = useRef(props.strokeWidth);
    const historyStateCallbackRef = useRef(props.onHistoryStateChange);
    const hasSavedPromptRef = useRef(props.initialState !== null);
    const persistInFlightRef = useRef<Promise<void> | null>(null);

    useEffect(() => {
      historyStateCallbackRef.current = props.onHistoryStateChange;
    }, [props.onHistoryStateChange]);

    const emitHistoryState = useCallback(() => {
      historyStateCallbackRef.current({
        canUndo: historyIndexRef.current > 0,
        canRedo:
          historyIndexRef.current >= 0 &&
          historyIndexRef.current < historyRef.current.length - 1,
      });
    }, []);

    const configureCanvas = useCallback(
      (
        canvas: Canvas,
        nextTool: VisualPromptTool,
        nextColor: string,
        nextStrokeWidth: number,
      ) => {
        const isDrawing = nextTool === "pen" || nextTool === "marker";
        const isSelecting = nextTool === "select";
        const isPanning = nextTool === "pan";

        canvas.isDrawingMode = isDrawing;
        canvas.selection = isSelecting;
        canvas.skipTargetFind = !isSelecting;
        canvas.defaultCursor =
          nextTool === "rectangle"
            ? "crosshair"
            : isPanning
              ? "grab"
              : "default";
        canvas.forEachObject((object) =>
          object.set({ selectable: isSelecting, evented: isSelecting }),
        );

        if (isDrawing && canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.width = nextStrokeWidth;
          canvas.freeDrawingBrush.color =
            nextTool === "marker" ? `${nextColor}66` : nextColor;
        }

        canvas.upperCanvasEl.style.pointerEvents = isPanning ? "none" : "auto";
        canvas.wrapperEl.style.touchAction =
          isDrawing || nextTool === "rectangle" ? "none" : "auto";
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      },
      [],
    );

    const captureHistory = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || loadingHistoryRef.current) return;

      const snapshot = JSON.stringify(canvas.toJSON());
      if (historyRef.current[historyIndexRef.current] === snapshot) return;

      historyRef.current = historyRef.current.slice(
        0,
        historyIndexRef.current + 1,
      );
      historyRef.current.push(snapshot);
      historyIndexRef.current = historyRef.current.length - 1;
      emitHistoryState();
    }, [emitHistoryState]);

    const loadSnapshot = useCallback(
      async (snapshot: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        loadingHistoryRef.current = true;
        try {
          canvas.discardActiveObject();
          await canvas.loadFromJSON(JSON.parse(snapshot));
          configureCanvas(
            canvas,
            toolRef.current,
            colorRef.current,
            strokeWidthRef.current,
          );
        } finally {
          loadingHistoryRef.current = false;
          emitHistoryState();
        }
      },
      [configureCanvas, emitHistoryState],
    );

    const undo = useCallback(async () => {
      if (historyIndexRef.current <= 0) return;
      historyIndexRef.current -= 1;
      await loadSnapshot(historyRef.current[historyIndexRef.current]);
    }, [loadSnapshot]);

    const redo = useCallback(async () => {
      if (
        historyIndexRef.current < 0 ||
        historyIndexRef.current >= historyRef.current.length - 1
      ) {
        return;
      }
      historyIndexRef.current += 1;
      await loadSnapshot(historyRef.current[historyIndexRef.current]);
    }, [loadSnapshot]);

    const deleteSelected = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const selected = canvas.getActiveObjects();
      if (selected.length === 0) return;

      loadingHistoryRef.current = true;
      canvas.discardActiveObject();
      selected.forEach((object) => canvas.remove(object));
      loadingHistoryRef.current = false;
      canvas.requestRenderAll();
      captureHistory();
    }, [captureHistory]);

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.getObjects().length === 0) return;

      loadingHistoryRef.current = true;
      canvas.discardActiveObject();
      canvas.getObjects().forEach((object) => canvas.remove(object));
      loadingHistoryRef.current = false;
      canvas.requestRenderAll();
      captureHistory();
    }, [captureHistory]);

    const persist = useCallback(async () => {
      if (persistInFlightRef.current) return persistInFlightRef.current;

      const request = (async () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error("Редактор разметки ещё не готов");
        }

        canvas.discardActiveObject();
        canvas.requestRenderAll();

        if (canvas.getObjects().length === 0) {
          if (!hasSavedPromptRef.current) return;

          const response = await fetch(
            `/api/v1/projects/${props.projectId}/visual-prompt`,
            { method: "DELETE" },
          );
          if (!response.ok) {
            throw new Error(
              await responseError(
                response,
                "Не удалось очистить сохранённую разметку",
              ),
            );
          }
          hasSavedPromptRef.current = false;
          return;
        }

        const state: VisualPromptCanvasState = {
          version: 1,
          coordinateSpace: {
            editorWidth: props.editorWidth,
            editorHeight: props.editorHeight,
            sourceWidth: props.sourceWidth,
            sourceHeight: props.sourceHeight,
          },
          fabric: canvas.toJSON() as Record<string, unknown>,
        };
        const overlay = await dataUrlToBlob(
          canvas.toDataURL({ format: "png", multiplier: 1 }),
        );
        const formData = new FormData();
        formData.set("overlay", overlay, "visual-prompt.png");
        formData.set("canvasState", JSON.stringify(state));

        const response = await fetch(
          `/api/v1/projects/${props.projectId}/visual-prompt`,
          { method: "PUT", body: formData },
        );
        if (!response.ok) {
          throw new Error(
            await responseError(response, "Не удалось сохранить разметку"),
          );
        }
        hasSavedPromptRef.current = true;
      })();

      persistInFlightRef.current = request;
      try {
        await request;
      } finally {
        persistInFlightRef.current = null;
      }
    }, [
      props.editorHeight,
      props.editorWidth,
      props.projectId,
      props.sourceHeight,
      props.sourceWidth,
    ]);

    useImperativeHandle(
      ref,
      () => ({ persist, undo, redo, deleteSelected, clear }),
      [clear, deleteSelected, persist, redo, undo],
    );

    useEffect(() => {
      if (!canvasElementRef.current) return;

      let disposed = false;
      let canvas: Canvas | null = null;

      void import("fabric").then(
        async ({ Canvas: FabricCanvas, PencilBrush, Rect }) => {
          if (disposed || !canvasElementRef.current) return;

          canvas = new FabricCanvas(canvasElementRef.current, {
            width: props.editorWidth,
            height: props.editorHeight,
            preserveObjectStacking: true,
            selection: false,
            fireRightClick: false,
            stopContextMenu: true,
            backgroundColor: "transparent",
          });
          canvasRef.current = canvas;
          canvas.freeDrawingBrush = new PencilBrush(canvas);

          const wrapper = canvas.wrapperEl;
          wrapper.style.width = "100%";
          wrapper.style.height = "100%";
          wrapper.classList.add("visual-prompt-canvas");

          const changed = () => captureHistory();
          canvas.on("path:created", changed);
          canvas.on("object:modified", changed);

          canvas.on("mouse:down", (event) => {
            if (toolRef.current !== "rectangle" || !event.scenePoint) return;

            const start = event.scenePoint;
            rectangleStartRef.current = { x: start.x, y: start.y };
            rectangleRef.current = new Rect({
              left: start.x,
              top: start.y,
              width: 0,
              height: 0,
              fill: `${colorRef.current}24`,
              stroke: colorRef.current,
              strokeWidth: strokeWidthRef.current,
              selectable: false,
              evented: false,
              strokeUniform: true,
            });
            canvas?.add(rectangleRef.current);
          });
          canvas.on("mouse:move", (event) => {
            const start = rectangleStartRef.current;
            const rectangle = rectangleRef.current;
            if (
              toolRef.current !== "rectangle" ||
              !start ||
              !rectangle ||
              !event.scenePoint
            ) {
              return;
            }

            const point = event.scenePoint;
            rectangle.set({
              left: Math.min(start.x, point.x),
              top: Math.min(start.y, point.y),
              width: Math.abs(point.x - start.x),
              height: Math.abs(point.y - start.y),
            });
            rectangle.setCoords();
            canvas?.requestRenderAll();
          });
          canvas.on("mouse:up", () => {
            const rectangle = rectangleRef.current;
            if (!rectangle) return;

            rectangle.set({ selectable: false, evented: false });
            rectangleRef.current = null;
            rectangleStartRef.current = null;
            captureHistory();
          });

          if (
            props.initialState?.version === 1 &&
            props.initialState.fabric
          ) {
            loadingHistoryRef.current = true;
            try {
              await canvas.loadFromJSON(props.initialState.fabric);
            } finally {
              loadingHistoryRef.current = false;
            }
          }

          configureCanvas(
            canvas,
            toolRef.current,
            colorRef.current,
            strokeWidthRef.current,
          );
          captureHistory();
        },
      );

      return () => {
        disposed = true;
        canvasRef.current = null;
        historyRef.current = [];
        historyIndexRef.current = -1;
        emitHistoryState();
        if (canvas) void canvas.dispose();
      };
    }, [
      captureHistory,
      configureCanvas,
      emitHistoryState,
      props.editorHeight,
      props.editorWidth,
      props.initialState,
    ]);

    useEffect(() => {
      toolRef.current = props.tool;
      colorRef.current = props.color;
      strokeWidthRef.current = props.strokeWidth;

      const canvas = canvasRef.current;
      if (!canvas) return;
      configureCanvas(canvas, props.tool, props.color, props.strokeWidth);
    }, [
      configureCanvas,
      props.color,
      props.strokeWidth,
      props.tool,
    ]);

    return (
      <canvas
        ref={canvasElementRef}
        aria-label="Разметка исходной фотографии"
      />
    );
  },
);
