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
import { dataUrlToBlob } from "@/lib/client/data-url";

type Props = {
  projectId?: string;
  editorWidth: number;
  editorHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  initialState: VisualPromptCanvasState | null;
  tool: VisualPromptTool;
  color: string;
  strokeWidth: number;
  onHistoryStateChange(state: { canUndo: boolean; canRedo: boolean }): void;
  onPersistenceStateChange(message: string | null): void;
};

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
    const canvasOperationQueueRef = useRef<Promise<void>>(Promise.resolve());
    const pendingCanvasOperationsRef = useRef(0);
    const rectangleRef = useRef<FabricRect | null>(null);
    const rectangleStartRef = useRef<{ x: number; y: number } | null>(null);
    const toolRef = useRef<VisualPromptTool>(props.tool);
    const colorRef = useRef(props.color);
    const strokeWidthRef = useRef(props.strokeWidth);
    const historyStateCallbackRef = useRef(props.onHistoryStateChange);
    const persistenceStateCallbackRef = useRef(
      props.onPersistenceStateChange,
    );
    const hasSavedPromptRef = useRef(props.initialState !== null);

    useEffect(() => {
      historyStateCallbackRef.current = props.onHistoryStateChange;
    }, [props.onHistoryStateChange]);

    useEffect(() => {
      persistenceStateCallbackRef.current = props.onPersistenceStateChange;
    }, [props.onPersistenceStateChange]);

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

    const lockCanvasInteraction = useCallback((canvas: Canvas) => {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.skipTargetFind = true;
      canvas.defaultCursor = "wait";
      canvas.upperCanvasEl.style.pointerEvents = "none";
      canvas.wrapperEl.style.touchAction = "auto";
      canvas.requestRenderAll();
    }, []);

    const enqueueCanvasOperation = useCallback(
      function enqueue<T>(action: () => Promise<T> | T): Promise<T> {
        pendingCanvasOperationsRef.current += 1;
        const activeCanvas = canvasRef.current;
        if (activeCanvas) lockCanvasInteraction(activeCanvas);

        const operation = canvasOperationQueueRef.current.then(async () => {
          try {
            return await action();
          } finally {
            pendingCanvasOperationsRef.current = Math.max(
              0,
              pendingCanvasOperationsRef.current - 1,
            );
            if (pendingCanvasOperationsRef.current === 0) {
              const canvas = canvasRef.current;
              if (canvas) {
                configureCanvas(
                  canvas,
                  toolRef.current,
                  colorRef.current,
                  strokeWidthRef.current,
                );
              }
            }
          }
        });
        // Each caller receives its own rejection, while the internal tail always
        // recovers so a later user action can still execute.
        canvasOperationQueueRef.current = operation.then(
          () => undefined,
          () => undefined,
        );
        return operation;
      },
      [configureCanvas, lockCanvasInteraction],
    );

    const captureHistory = useCallback((withinQueuedOperation = false) => {
      const canvas = canvasRef.current;
      if (
        !canvas ||
        loadingHistoryRef.current ||
        (!withinQueuedOperation && pendingCanvasOperationsRef.current > 0)
      ) {
        return;
      }

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

    const loadSnapshot = useCallback(async (snapshot: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      loadingHistoryRef.current = true;
      try {
        canvas.discardActiveObject();
        await canvas.loadFromJSON(JSON.parse(snapshot));
      } finally {
        loadingHistoryRef.current = false;
      }
    }, []);

    const undo = useCallback(
      () =>
        enqueueCanvasOperation(async () => {
          if (historyIndexRef.current <= 0) return;
          historyIndexRef.current -= 1;
          emitHistoryState();
          await loadSnapshot(historyRef.current[historyIndexRef.current]);
        }),
      [emitHistoryState, enqueueCanvasOperation, loadSnapshot],
    );

    const redo = useCallback(
      () =>
        enqueueCanvasOperation(async () => {
          if (
            historyIndexRef.current < 0 ||
            historyIndexRef.current >= historyRef.current.length - 1
          ) {
            return;
          }
          historyIndexRef.current += 1;
          emitHistoryState();
          await loadSnapshot(historyRef.current[historyIndexRef.current]);
        }),
      [emitHistoryState, enqueueCanvasOperation, loadSnapshot],
    );

    const deleteSelected = useCallback(() => {
      void enqueueCanvasOperation(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const selected = canvas.getActiveObjects();
        if (selected.length === 0) return;

        canvas.discardActiveObject();
        selected.forEach((object) => canvas.remove(object));
        canvas.requestRenderAll();
        captureHistory(true);
      });
    }, [captureHistory, enqueueCanvasOperation]);

    const clear = useCallback(
      () =>
        enqueueCanvasOperation(() => {
          const canvas = canvasRef.current;
          if (!canvas || canvas.getObjects().length === 0) return;

          canvas.discardActiveObject();
          canvas.getObjects().forEach((object) => canvas.remove(object));
          canvas.requestRenderAll();
          captureHistory(true);
        }),
      [captureHistory, enqueueCanvasOperation],
    );

    const persist = useCallback(
      () =>
        enqueueCanvasOperation(async () => {
          const canvas = canvasRef.current;
          if (!canvas) {
            throw new Error("Редактор разметки ещё не готов");
          }

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
            persistenceStateCallbackRef.current(null);
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
            `/api/v1/projects/${props.projectId!}/visual-prompt`,
            { method: "PUT", body: formData },
          );
          if (!response.ok) {
            throw new Error(
              await responseError(response, "Не удалось сохранить разметку"),
            );
          }
          hasSavedPromptRef.current = true;
          persistenceStateCallbackRef.current(null);
        }),
      [
        props.editorHeight,
        props.editorWidth,
        props.projectId,
        props.sourceHeight,
        props.sourceWidth,
        enqueueCanvasOperation,
      ],
    );

    const snapshot = useCallback(
      () =>
        enqueueCanvasOperation(async () => {
          const canvas = canvasRef.current;
          if (!canvas || canvas.getObjects().length === 0) return null;
          canvas.requestRenderAll();
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
          return { state, overlay };
        }),
      [
        enqueueCanvasOperation,
        props.editorHeight,
        props.editorWidth,
        props.sourceHeight,
        props.sourceWidth,
      ],
    );

    useImperativeHandle(
      ref,
      () => ({ persist, snapshot, undo, redo, deleteSelected, clear }),
      [clear, deleteSelected, persist, redo, snapshot, undo],
    );

    useEffect(() => {
      if (!canvasElementRef.current) return;

      let disposed = false;
      let canvas: Canvas | null = null;

      void import("fabric").then(
        async ({
          Canvas: FabricCanvas,
          FabricImage,
          PencilBrush,
          Rect,
          util,
        }) => {
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

          let migratedCoordinateSpace = false;
          if (
            props.initialState?.version === 1 &&
            props.initialState.fabric
          ) {
            loadingHistoryRef.current = true;
            try {
              await canvas.loadFromJSON(props.initialState.fabric);
              const savedWidth =
                props.initialState.coordinateSpace.editorWidth;
              const savedHeight =
                props.initialState.coordinateSpace.editorHeight;
              const scaleX = props.editorWidth / savedWidth;
              const scaleY = props.editorHeight / savedHeight;

              if (
                Number.isFinite(scaleX) &&
                Number.isFinite(scaleY) &&
                scaleX > 0 &&
                scaleY > 0 &&
                (scaleX !== 1 || scaleY !== 1)
              ) {
                const activeCanvas = canvas;
                const renderOnAddRemove = activeCanvas.renderOnAddRemove;
                activeCanvas.renderOnAddRemove = false;
                try {
                  activeCanvas.getObjects().forEach((object, index) => {
                    let migratedObject = object;
                    if (object.strokeUniform) {
                      // Bake the legacy canvas-space appearance before applying
                      // the outer coordinate transform. Alpha-trimming the
                      // padded render avoids Fabric's fractional bbox clipping
                      // without changing the pixels or averaging stroke scale.
                      const oldCenter = object.getRelativeCenterPoint();
                      const baseRaster = object.toCanvasElement({
                        enableRetinaScaling: false,
                      });
                      const padding = Math.ceil(
                        object.strokeWidth *
                          Math.max(1, object.strokeMiterLimit) +
                          2,
                      );
                      const paddedRaster = object.toCanvasElement({
                        enableRetinaScaling: false,
                        left: -padding,
                        top: -padding,
                        width: baseRaster.width + padding * 2,
                        height: baseRaster.height + padding * 2,
                      });
                      const context = paddedRaster.getContext("2d", {
                        willReadFrequently: true,
                      });
                      let cropLeft = 0;
                      let cropTop = 0;
                      let cropRight = paddedRaster.width - 1;
                      let cropBottom = paddedRaster.height - 1;

                      if (context) {
                        const pixels = context.getImageData(
                          0,
                          0,
                          paddedRaster.width,
                          paddedRaster.height,
                        ).data;
                        let alphaLeft = paddedRaster.width;
                        let alphaTop = paddedRaster.height;
                        let alphaRight = -1;
                        let alphaBottom = -1;
                        for (let y = 0; y < paddedRaster.height; y += 1) {
                          for (let x = 0; x < paddedRaster.width; x += 1) {
                            if (
                              pixels[
                                (y * paddedRaster.width + x) * 4 + 3
                              ] === 0
                            ) {
                              continue;
                            }
                            alphaLeft = Math.min(alphaLeft, x);
                            alphaTop = Math.min(alphaTop, y);
                            alphaRight = Math.max(alphaRight, x);
                            alphaBottom = Math.max(alphaBottom, y);
                          }
                        }
                        if (alphaRight >= alphaLeft && alphaBottom >= alphaTop) {
                          cropLeft = Math.max(0, alphaLeft - 1);
                          cropTop = Math.max(0, alphaTop - 1);
                          cropRight = Math.min(
                            paddedRaster.width - 1,
                            alphaRight + 1,
                          );
                          cropBottom = Math.min(
                            paddedRaster.height - 1,
                            alphaBottom + 1,
                          );
                        }
                      }

                      const cropWidth = cropRight - cropLeft + 1;
                      const cropHeight = cropBottom - cropTop + 1;
                      const raster =
                        paddedRaster.ownerDocument.createElement("canvas");
                      raster.width = cropWidth;
                      raster.height = cropHeight;
                      raster
                        .getContext("2d")
                        ?.drawImage(
                          paddedRaster,
                          cropLeft,
                          cropTop,
                          cropWidth,
                          cropHeight,
                          0,
                          0,
                          cropWidth,
                          cropHeight,
                        );
                      const paddedCenterX = baseRaster.width / 2 + padding;
                      const paddedCenterY = baseRaster.height / 2 + padding;
                      const bakedImage = new FabricImage(raster, {
                        left:
                          oldCenter.x +
                          cropLeft +
                          cropWidth / 2 -
                          paddedCenterX,
                        top:
                          oldCenter.y +
                          cropTop +
                          cropHeight / 2 -
                          paddedCenterY,
                        originX: "center",
                        originY: "center",
                        selectable: object.selectable,
                        evented: object.evented,
                        visible: object.visible,
                      });
                      activeCanvas.remove(object);
                      activeCanvas.insertAt(index, bakedImage);
                      migratedObject = bakedImage;
                    }
                    util.addTransformToObject(migratedObject, [
                      scaleX,
                      0,
                      0,
                      scaleY,
                      0,
                      0,
                    ]);
                    migratedObject.setCoords();
                  });
                } finally {
                  activeCanvas.renderOnAddRemove = renderOnAddRemove;
                }
                migratedCoordinateSpace = true;
              }
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
          if (migratedCoordinateSpace) {
            void persist().catch((error: unknown) => {
              persistenceStateCallbackRef.current(
                error instanceof Error
                  ? `Разметка восстановлена, но не удалось сохранить обновлённые координаты: ${error.message}`
                  : "Разметка восстановлена, но не удалось сохранить обновлённые координаты",
              );
            });
          }
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
      persist,
    ]);

    useEffect(() => {
      toolRef.current = props.tool;
      colorRef.current = props.color;
      strokeWidthRef.current = props.strokeWidth;

      const canvas = canvasRef.current;
      if (!canvas) return;
      if (pendingCanvasOperationsRef.current > 0) return;
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
