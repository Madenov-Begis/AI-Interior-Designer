"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { Canvas, PencilBrush } from "fabric";
import type { EraserBrush } from "@erase2d/fabric";
import type {
  VisualPromptCanvasState,
  VisualPromptEditorHandle,
  VisualPromptTool,
} from "@/features/visual-prompt";
import { apiData } from "@/shared/api";
import { CanvasHistory } from "../model/canvas-history";
import { migrateCanvasCoordinates } from "../model/canvas-coordinate-migration";
import { canvasToPngBlob } from "../model/visual-prompt-canvas-export";
import { placementRegionsFromObjects } from "../model/visual-prompt-regions";

import { useAppSession } from "@/features/auth/index.client";
import { IndexedCanvasDraftStore } from "@/shared/lib/browser/indexed-canvas-draft";

import {
  bindRectangleTool,
  configureCanvasTools,
  type ErasableFabricObject,
} from "../model/canvas-tools";
import { useAppText } from "@/shared/providers";

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

export const VisualPromptEditor = forwardRef<VisualPromptEditorHandle, Props>(
  function VisualPromptEditor(props, ref) {
    const t = useAppText();
    const { user } = useAppSession();
    const draftStore = useMemo(
      () =>
        props.projectId
          ? new IndexedCanvasDraftStore(user.id, props.projectId)
          : null,
      [user.id, props.projectId],
    );
    const savedStateRef = useRef(props.initialState);
    const dirtyRef = useRef(false);
    const draftConflictRef = useRef(false);
    const canvasElementRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = useRef<Canvas | null>(null);
    const historyRef = useRef(new CanvasHistory());
    const loadingHistoryRef = useRef(false);
    const canvasOperationQueueRef = useRef<Promise<void>>(Promise.resolve());
    const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
    const pendingCanvasOperationsRef = useRef(0);
    const resetRectangleRef = useRef<(() => void) | null>(null);
    const pencilBrushRef = useRef<PencilBrush | null>(null);
    const eraserBrushRef = useRef<EraserBrush | null>(null);
    const toolRef = useRef<VisualPromptTool>(props.tool);
    const colorRef = useRef(props.color);
    const strokeWidthRef = useRef(props.strokeWidth);
    const historyStateCallbackRef = useRef(props.onHistoryStateChange);
    const persistenceStateCallbackRef = useRef(props.onPersistenceStateChange);
    const hasSavedPromptRef = useRef(props.initialState !== null);
    const persistLatestRef = useRef<() => Promise<void>>(async () => undefined);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      historyStateCallbackRef.current = props.onHistoryStateChange;
    }, [props.onHistoryStateChange]);

    useEffect(() => {
      persistenceStateCallbackRef.current = props.onPersistenceStateChange;
    }, [props.onPersistenceStateChange]);

    const emitHistoryState = useCallback(() => {
      historyStateCallbackRef.current(historyRef.current.state);
    }, []);

    const readCanvasState = useCallback(
      (canvas: Canvas): VisualPromptCanvasState => ({
        version: 2,
        coordinateSpace: {
          editorWidth: props.editorWidth,
          editorHeight: props.editorHeight,
          sourceWidth: props.sourceWidth,
          sourceHeight: props.sourceHeight,
        },
        placementRegions: placementRegionsFromObjects(
          canvas.getObjects(),
          props.editorWidth,
          props.editorHeight,
        ),
        fabric: canvas.toJSON() as Record<string, unknown>,
      }),
      [
        props.editorWidth,
        props.editorHeight,
        props.sourceWidth,
        props.sourceHeight,
      ],
    );

    const acknowledgeDraft = useCallback(
      (state: VisualPromptCanvasState, used: boolean) => {
        savedStateRef.current = used ? state : null;
        try {
          void draftStore?.acknowledge(state).catch(() => undefined);
        } catch {
          /* keep draft if storage is unavailable */
        }
        const canvas = canvasRef.current;
        if (
          canvas &&
          JSON.stringify(readCanvasState(canvas)) === JSON.stringify(state)
        )
          dirtyRef.current = false;
      },
      [draftStore, readCanvasState],
    );

    const schedulePersist = useCallback(() => {
      if (!props.projectId) return;
      dirtyRef.current = true;
      draftConflictRef.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          void draftStore
            ?.save(readCanvasState(canvas), savedStateRef.current)
            .catch(() => {
              persistenceStateCallbackRef.current(
                t("Локальный черновик недоступен. Не закрывайте страницу до сохранения разметки."),
              );
            });
        } catch {
          persistenceStateCallbackRef.current(
            t("Локальный черновик недоступен. Не закрывайте страницу до сохранения разметки."),
          );
        }
      }
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);

      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        void persistLatestRef.current().catch((error: unknown) => {
          persistenceStateCallbackRef.current(
            error instanceof Error
              ? `${t("Не удалось сохранить разметку")}: ${t(error.message)}`
              : t("Не удалось сохранить разметку"),
          );
        });
      }, 800);
    }, [props.projectId, draftStore, readCanvasState, t]);

    const configureCanvas = useCallback(
      (
        canvas: Canvas,
        nextTool: VisualPromptTool,
        nextColor: string,
        nextStrokeWidth: number,
      ) => {
        configureCanvasTools(canvas, nextTool, nextColor, nextStrokeWidth, {
          pencil: pencilBrushRef.current,
          eraser: eraserBrushRef.current,
        });
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

    const captureHistory = useCallback(
      (withinQueuedOperation = false, persistChange = true) => {
        const canvas = canvasRef.current;
        if (
          !canvas ||
          loadingHistoryRef.current ||
          (!withinQueuedOperation && pendingCanvasOperationsRef.current > 0)
        ) {
          return;
        }

        const snapshot = JSON.stringify(canvas.toJSON());
        if (!historyRef.current.capture(snapshot)) return;
        emitHistoryState();
        if (persistChange) schedulePersist();
      },
      [emitHistoryState, schedulePersist],
    );

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
          const snapshot = historyRef.current.peek(-1);
          if (snapshot === undefined) return;
          await loadSnapshot(snapshot);
          historyRef.current.move(-1);
          emitHistoryState();
          schedulePersist();
        }),
      [emitHistoryState, enqueueCanvasOperation, loadSnapshot, schedulePersist],
    );

    const redo = useCallback(
      () =>
        enqueueCanvasOperation(async () => {
          const snapshot = historyRef.current.peek(1);
          if (snapshot === undefined) return;
          await loadSnapshot(snapshot);
          historyRef.current.move(1);
          emitHistoryState();
          schedulePersist();
        }),
      [emitHistoryState, enqueueCanvasOperation, loadSnapshot, schedulePersist],
    );

    const clear = useCallback(
      () =>
        enqueueCanvasOperation(() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          if (canvas.getObjects().length === 0) return;

          resetRectangleRef.current?.();
          canvas.discardActiveObject();
          canvas.clear();
          canvas.requestRenderAll();
          captureHistory(true);
        }),
      [captureHistory, enqueueCanvasOperation],
    );

    const persist = useCallback(() => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      // Only snapshot/export holds the canvas lock. Serial HTTP writes run in a
      // separate queue, so drawing and undo remain available during slow saves.
      const captured = enqueueCanvasOperation(async () => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error(t("Редактор разметки ещё не готов"));
        canvas.requestRenderAll();
        const state = readCanvasState(canvas);
        const overlay = canvas.getObjects().length
          ? await canvasToPngBlob(canvas)
          : null;
        return { state, overlay };
      });
      // Observe capture rejection immediately, even while an earlier HTTP call is pending.
      const snapshotResult = captured.then(
        (value) => ({ value }),
        (error) => ({ error }),
      );
      const operation = persistenceQueueRef.current.then(async () => {
        const result = await snapshotResult;
        if ("error" in result) throw result.error;
        if (!props.projectId) return;
        const { state, overlay } = result.value;
        if (!overlay) {
          // DELETE also reconciles an earlier PUT whose response was lost.
          await apiData({
            url: `/projects/${props.projectId}/visual-prompt`,
            method: "DELETE",
            timeout: 30_000,
          });
        } else {
          const formData = new FormData();
          formData.set("overlay", overlay, "visual-prompt.png");
          formData.set("canvasState", JSON.stringify(state));
          await apiData({
            url: `/projects/${props.projectId}/visual-prompt`,
            method: "PUT",
            timeout: 30_000,
            data: formData,
          });
        }
        hasSavedPromptRef.current = Boolean(overlay);
        acknowledgeDraft(state, Boolean(overlay));
        persistenceStateCallbackRef.current(null);
      });
      persistenceQueueRef.current = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    }, [
      props.projectId,
      enqueueCanvasOperation,
      readCanvasState,
      acknowledgeDraft,
      t,
    ]);

    useEffect(() => {
      persistLatestRef.current = persist;
    }, [persist]);

    const snapshot = useCallback(
      () =>
        enqueueCanvasOperation(async () => {
          const canvas = canvasRef.current;
          if (!canvas || canvas.getObjects().length === 0) return null;
          canvas.requestRenderAll();
          const state = readCanvasState(canvas);
          const overlay = await canvasToPngBlob(canvas);
          return { state, overlay };
        }),
      [enqueueCanvasOperation, readCanvasState],
    );

    const markPersisted = useCallback(
      (used: boolean, state?: VisualPromptCanvasState | null) => {
        hasSavedPromptRef.current = used;
        if (state) acknowledgeDraft(state, used);
        else if (
          state === null &&
          canvasRef.current?.getObjects().length === 0
        ) {
          acknowledgeDraft(readCanvasState(canvasRef.current), false);
        }
        persistenceStateCallbackRef.current(null);
      },
      [acknowledgeDraft, readCanvasState],
    );

    useEffect(() => {
      const beforeUnload = (event: BeforeUnloadEvent) => {
        if (!dirtyRef.current) return;
        event.preventDefault();
        event.returnValue = "";
      };
      const retryPersist = () => {
        if (dirtyRef.current && !draftConflictRef.current) {
          void persistLatestRef.current().catch(() => {
            persistenceStateCallbackRef.current(
              t("Не удалось сохранить разметку. Черновик остаётся в этом браузере."),
            );
          });
        }
      };
      window.addEventListener("beforeunload", beforeUnload);
      window.addEventListener("online", retryPersist);
      return () => {
        window.removeEventListener("beforeunload", beforeUnload);
        window.removeEventListener("online", retryPersist);
      };
    }, [t]);

    useImperativeHandle(
      ref,
      () => ({
        persist,
        markPersisted,
        snapshot,
        undo,
        redo,
        clear,
      }),
      [clear, markPersisted, persist, redo, snapshot, undo],
    );

    useEffect(() => {
      if (!canvasElementRef.current) return;
      const history = historyRef.current;

      let disposed = false;
      let canvas: Canvas | null = null;
      let disposeEraserEnd: (() => void) | null = null;
      let eraserBrush: EraserBrush | null = null;

      void Promise.all([import("fabric"), import("@erase2d/fabric")])
        .then(
          async ([
            { Canvas: FabricCanvas, FabricImage, PencilBrush, Rect, util },
            { EraserBrush },
          ]) => {
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
            const pencilBrush = new PencilBrush(canvas);
            eraserBrush = new EraserBrush(canvas);
            pencilBrushRef.current = pencilBrush;
            eraserBrushRef.current = eraserBrush;
            canvas.freeDrawingBrush = pencilBrush;

            disposeEraserEnd = eraserBrush.on("end", (event) => {
              event.preventDefault();
              void enqueueCanvasOperation(async () => {
                if (!eraserBrush) return;
                await eraserBrush.commit(event.detail);
                canvas?.requestRenderAll();
                captureHistory(true);
              }).catch((error: unknown) => {
                persistenceStateCallbackRef.current(
                  error instanceof Error
                    ? `${t("Не удалось стереть разметку")}: ${t(error.message)}`
                    : t("Не удалось стереть разметку"),
                );
              });
            });

            const wrapper = canvas.wrapperEl;
            wrapper.style.width = "100%";
            wrapper.style.height = "100%";
            wrapper.classList.add("visual-prompt-canvas");

            canvas.on("path:created", (event) => {
              (event.path as ErasableFabricObject).erasable = true;
              captureHistory();
            });
            canvas.on("object:modified", () => captureHistory());

            resetRectangleRef.current = bindRectangleTool(
              canvas,
              Rect,
              () => ({
                tool: toolRef.current,
                color: colorRef.current,
                strokeWidth: strokeWidthRef.current,
              }),
              captureHistory,
            );

            if (disposed) return;
            savedStateRef.current = props.initialState;
            hasSavedPromptRef.current = props.initialState !== null;
            let restored: Awaited<ReturnType<IndexedCanvasDraftStore["read"]>> =
              null;
            try {
              restored =
                (await draftStore?.read(
                  props.sourceWidth,
                  props.sourceHeight,
                  props.initialState,
                )) ?? null;
            } catch {
              persistenceStateCallbackRef.current(
                t("Не удалось прочитать локальный черновик."),
              );
            }
            if (disposed) return;
            const initialState = restored?.state ?? props.initialState;
            dirtyRef.current = Boolean(restored);
            draftConflictRef.current = restored?.conflict ?? false;
            let migratedCoordinateSpace = false;
            const migratedStateVersion = initialState?.version === 1;
            if (initialState?.fabric) {
              loadingHistoryRef.current = true;
              try {
                await canvas.loadFromJSON(initialState.fabric);
                if (disposed) return;
                migratedCoordinateSpace = migrateCanvasCoordinates(
                  canvas,
                  initialState,
                  props.editorWidth,
                  props.editorHeight,
                  { FabricImage, util },
                );
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
            captureHistory(false, false);
            if (restored?.conflict) {
              persistenceStateCallbackRef.current(
                t("Восстановлен локальный черновик, но на сервере другая версия. Проверьте разметку перед дальнейшей работой."),
              );
            } else if (
              migratedCoordinateSpace ||
              migratedStateVersion ||
              restored
            ) {
              void persist().catch((error: unknown) => {
                persistenceStateCallbackRef.current(
                  error instanceof Error
                    ? `${t("Разметка восстановлена, но не удалось сохранить обновлённые координаты")}: ${t(error.message)}`
                    : t("Разметка восстановлена, но не удалось сохранить обновлённые координаты"),
                );
              });
            }
          },
        )
        .catch(() => {
          if (!disposed)
            persistenceStateCallbackRef.current(
              t("Не удалось восстановить редактор. Перезагрузите страницу; локальный черновик сохранён."),
            );
        });

      return () => {
        disposed = true;
        if (persistTimerRef.current) {
          clearTimeout(persistTimerRef.current);
          persistTimerRef.current = null;
        }
        disposeEraserEnd?.();
        eraserBrush?.dispose();
        resetRectangleRef.current = null;
        pencilBrushRef.current = null;
        eraserBrushRef.current = null;
        canvasRef.current = null;
        history.clear();
        emitHistoryState();
        if (canvas) void canvas.dispose();
      };
    }, [
      captureHistory,
      configureCanvas,
      emitHistoryState,
      enqueueCanvasOperation,
      props.editorHeight,
      props.editorWidth,
      props.initialState,
      props.sourceWidth,
      props.sourceHeight,
      draftStore,
      persist,
      t,
    ]);

    useEffect(() => {
      toolRef.current = props.tool;
      colorRef.current = props.color;
      strokeWidthRef.current = props.strokeWidth;

      const canvas = canvasRef.current;
      if (!canvas) return;
      if (pendingCanvasOperationsRef.current > 0) return;
      configureCanvas(canvas, props.tool, props.color, props.strokeWidth);
    }, [configureCanvas, props.color, props.strokeWidth, props.tool]);

    return (
      <canvas
        ref={canvasElementRef}
        aria-label={t("Разметка исходной фотографии")}
      />
    );
  },
);
