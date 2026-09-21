"use client";

import { Check, Focus, Maximize2, Minus, Plus } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type ReactNode,
} from "react";
import { VisualPromptEditor } from "./visual-prompt-editor";
import type {
  VisualPromptCanvasState,
  VisualPromptEditorHandle,
  VisualPromptTool,
} from "@/features/visual-prompt";
import {
  positionFloatingOverlay,
  screenRectForWorldItem,
} from "@/features/generate-design";
import {
  CANVAS_ZOOM_STEP,
  MAX_CANVAS_SCALE,
  MIN_CANVAS_SCALE,
  canvasWheelAction,
  clampCanvasScale,
  zoomTransformAroundPoint,
  type CanvasTransform,
} from "../model/canvas-navigation";
import {
  calculateCanvasLayout,
  canvasCardHeight,
  canvasViewportInsets,
  CARD_HEADER_HEIGHT,
  CARD_WIDTH,
  constrainCanvasTransform,
  SOURCE_X,
  SOURCE_Y,
  type CanvasSize,
} from "../model/canvas-layout";
import { useAppText } from "@/shared/providers";

type ViewportTransform = CanvasTransform;
type ViewportSize = CanvasSize;
export type CanvasViewportHandle = {
  zoomIn(): void;
  zoomOut(): void;
  fitToContent(): void;
  focusItem(itemId: string): void;
};

type Source = {
  projectId: string;
  imageUrl: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  initialState: VisualPromptCanvasState | null;
};

export type CanvasGenerationNode = {
  id: string;
  ariaLabel?: string;
  node: ReactNode;
  interactive?: boolean;
};

type CanvasViewportProps = {
  source: Source;
  generations: CanvasGenerationNode[];
  selectedItemId: string;
  tool: VisualPromptTool;
  color: string;
  strokeWidth: number;
  editorRef: Ref<VisualPromptEditorHandle>;
  selectedGenerationOverlay?: ReactNode;
  selectedGenerationOverlaySize?: ViewportSize;
  onHistoryStateChange(state: { canUndo: boolean; canRedo: boolean }): void;
  onEditorError(message: string | null): void;
  onSelectItem(itemId: string): void;
  onActivateSource?(): void;
};

export const CanvasViewport = forwardRef<
  CanvasViewportHandle,
  CanvasViewportProps
>(function CanvasViewport(
  {
    source,
    generations,
    selectedItemId,
    tool,
    color,
    strokeWidth,
    editorRef,
    selectedGenerationOverlay,
    selectedGenerationOverlaySize = { width: 640, height: 64 },
    onHistoryStateChange,
    onEditorError,
    onSelectItem,
    onActivateSource,
  },
  ref,
) {
  const t = useAppText();
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    transformX: number;
    transformY: number;
  } | null>(null);
  const panMovedRef = useRef(false);
  const initialFitRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [transform, setTransform] = useState<ViewportTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const viewportInsets = useMemo(
    () => canvasViewportInsets(viewportSize.width),
    [viewportSize.width],
  );

  const sourceCardHeight = canvasCardHeight(source.width, source.height);
  const { generationPositions, worldBounds } = useMemo(
    () =>
      calculateCanvasLayout({
        generationHeights: generations.map(() => sourceCardHeight),
        sourceCardHeight,
        viewportWidth: viewportSize.width,
      }),
    [generations, sourceCardHeight, viewportSize.width],
  );
  const selectedGenerationIndex = generations.findIndex(
    (generation) => generation.id === selectedItemId,
  );
  const selectedGenerationPosition =
    selectedGenerationIndex >= 0
      ? generationPositions[selectedGenerationIndex]
      : undefined;
  const selectedGenerationRect = selectedGenerationPosition
    ? screenRectForWorldItem({
        item: {
          ...selectedGenerationPosition,
          width: CARD_WIDTH,
          height: sourceCardHeight,
        },
        transform,
      })
    : null;
  const selectedGenerationOverlayPosition = selectedGenerationRect
    ? positionFloatingOverlay({
        anchor: selectedGenerationRect,
        viewport: viewportSize,
        overlay: selectedGenerationOverlaySize,
        margin: 16,
        gap: 8,
      })
    : null;

  const fitToContent = useCallback(() => {
    if (viewportSize.width === 0 || viewportSize.height === 0) return;

    const contentWidth = worldBounds.maxX - worldBounds.minX;
    const contentHeight = worldBounds.maxY - worldBounds.minY;
    const availableWidth = Math.max(
      1,
      viewportSize.width - viewportInsets.left - viewportInsets.right,
    );
    const availableHeight = Math.max(
      1,
      viewportSize.height - viewportInsets.top - viewportInsets.bottom,
    );
    const nextScale = clampCanvasScale(
      Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
    );

    setTransform({
      scale: nextScale,
      x:
        viewportInsets.left +
        (availableWidth - contentWidth * nextScale) / 2 -
        worldBounds.minX * nextScale,
      y:
        viewportInsets.top +
        (availableHeight - contentHeight * nextScale) / 2 -
        worldBounds.minY * nextScale,
    });
  }, [viewportInsets, viewportSize, worldBounds]);

  const getWorldItemRect = useCallback(
    (itemId: string) => {
      if (itemId === "source") {
        return {
          x: SOURCE_X,
          y: SOURCE_Y,
          width: CARD_WIDTH,
          height: sourceCardHeight,
        };
      }

      const index = generations.findIndex(
        (generation) => generation.id === itemId,
      );
      const position = generationPositions[index];
      if (index < 0 || !position) return null;

      return {
        ...position,
        width: CARD_WIDTH,
        height: sourceCardHeight,
      };
    },
    [generationPositions, generations, sourceCardHeight],
  );

  const focusItem = useCallback(
    (itemId: string) => {
      const item = getWorldItemRect(itemId);
      if (!item || viewportSize.width === 0 || viewportSize.height === 0)
        return;

      const availableWidth = Math.max(
        1,
        viewportSize.width - viewportInsets.left - viewportInsets.right,
      );
      const availableHeight = Math.max(
        1,
        viewportSize.height - viewportInsets.top - viewportInsets.bottom,
      );
      const scale = clampCanvasScale(
        Math.min(1, availableWidth / item.width, availableHeight / item.height),
      );

      setTransform(
        constrainCanvasTransform(
          {
            scale,
            x:
              viewportInsets.left +
              (availableWidth - item.width * scale) / 2 -
              item.x * scale,
            y:
              viewportInsets.top +
              (availableHeight - item.height * scale) / 2 -
              item.y * scale,
          },
          viewportSize,
          worldBounds,
          viewportInsets,
        ),
      );
    },
    [getWorldItemRect, viewportInsets, viewportSize, worldBounds],
  );

  const zoomBy = useCallback(
    (factor: number, pointerX: number, pointerY: number) => {
      setTransform((current) => {
        const next = zoomTransformAroundPoint(current, current.scale * factor, {
          x: pointerX,
          y: pointerY,
        });
        return constrainCanvasTransform(
          next,
          viewportSize,
          worldBounds,
          viewportInsets,
        );
      });
    },
    [viewportInsets, viewportSize, worldBounds],
  );

  const zoomFromCenter = useCallback(
    (factor: number) => {
      zoomBy(factor, viewportSize.width / 2, viewportSize.height / 2);
    },
    [viewportSize.height, viewportSize.width, zoomBy],
  );

  const resetZoom = useCallback(() => {
    setTransform((current) =>
      constrainCanvasTransform(
        zoomTransformAroundPoint(current, 1, {
          x: viewportSize.width / 2,
          y: viewportSize.height / 2,
        }),
        viewportSize,
        worldBounds,
        viewportInsets,
      ),
    );
  }, [viewportInsets, viewportSize, worldBounds]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomFromCenter(CANVAS_ZOOM_STEP),
      zoomOut: () => zoomFromCenter(1 / CANVAS_ZOOM_STEP),
      fitToContent,
      focusItem,
    }),
    [fitToContent, focusItem, zoomFromCenter],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      initialFitRef.current ||
      viewportSize.width === 0 ||
      viewportSize.height === 0
    ) {
      return;
    }
    initialFitRef.current = true;
    if (generations.length > 6) focusItem(selectedItemId);
    else fitToContent();
  }, [
    fitToContent,
    focusItem,
    generations.length,
    selectedItemId,
    viewportSize.height,
    viewportSize.width,
  ]);

  useEffect(() => {
    if (!initialFitRef.current) return;
    setTransform((current) =>
      constrainCanvasTransform(
        current,
        viewportSize,
        worldBounds,
        viewportInsets,
      ),
    );
  }, [viewportInsets, viewportSize, worldBounds]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const rect = viewport.getBoundingClientRect();
      const modeMultiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? viewport.clientHeight
            : 1;
      const deltaX = event.deltaX * modeMultiplier;
      const deltaY = event.deltaY * modeMultiplier;
      const availableWidth = Math.max(
        1,
        viewportSize.width - viewportInsets.left - viewportInsets.right,
      );
      const availableHeight = Math.max(
        1,
        viewportSize.height - viewportInsets.top - viewportInsets.bottom,
      );
      const contentWidth =
        (worldBounds.maxX - worldBounds.minX) * transform.scale;
      const contentHeight =
        (worldBounds.maxY - worldBounds.minY) * transform.scale;
      const action = canvasWheelAction({
        deltaX,
        deltaY,
        zoomModifier: event.ctrlKey || event.metaKey,
        preferHorizontal:
          event.shiftKey ||
          (contentWidth > availableWidth && contentHeight <= availableHeight),
      });

      if (action.type === "zoom") {
        zoomBy(
          action.factor,
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
        return;
      }

      setTransform((current) =>
        constrainCanvasTransform(
          {
            ...current,
            x: current.x - action.deltaX,
            y: current.y - action.deltaY,
          },
          viewportSize,
          worldBounds,
          viewportInsets,
        ),
      );
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [transform.scale, viewportInsets, viewportSize, worldBounds, zoomBy]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const isMiddleMouse = event.pointerType === "mouse" && event.button === 1;
    const isPrimaryPointer =
      event.pointerType !== "mouse" || event.button === 0;
    if (!isMiddleMouse && !isPrimaryPointer) return;

    const target = event.target;
    if (
      !isMiddleMouse &&
      target instanceof Element &&
      target.closest("[data-canvas-item]")
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panMovedRef.current = false;
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      transformX: transform.x,
      transformY: transform.y,
    };
    setIsPanning(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - pan.startX;
    const deltaY = event.clientY - pan.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) {
      panMovedRef.current = true;
    }
    setTransform(
      constrainCanvasTransform(
        {
          ...transform,
          x: pan.transformX + deltaX,
          y: pan.transformY + deltaY,
        },
        viewportSize,
        worldBounds,
        viewportInsets,
      ),
    );
  }

  function finishPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (panRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panRef.current = null;
    setIsPanning(false);
    if (panMovedRef.current) {
      requestAnimationFrame(() => {
        panMovedRef.current = false;
      });
    }
  }

  function selectItem(itemId: string) {
    if (panMovedRef.current) {
      panMovedRef.current = false;
      return;
    }
    onSelectItem(itemId);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.matches("input, textarea, select, button"))
    ) {
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomFromCenter(CANVAS_ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomFromCenter(1 / CANVAS_ZOOM_STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      fitToContent();
    } else if (event.key === "1") {
      event.preventDefault();
      focusItem(selectedItemId);
    }
  }

  return (
    <div
      ref={viewportRef}
      className={`canvas-viewport ${
        isPanning ? "canvas-viewport--panning" : ""
      }`}
      aria-label={t("Холст проекта")}
      aria-describedby="canvas-viewport-instructions"
      role="region"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPan}
      onPointerCancel={finishPan}
    >
      <p id="canvas-viewport-instructions" className="sr-only">
        {t("Перетаскивайте свободную область, чтобы перемещать холст. Колесо или трекпад прокручивает холст, Control или Command с колесом изменяет масштаб. Клавиши плюс и минус меняют масштаб, ноль показывает всё, единица показывает выбранный объект.")}
      </p>
      <div
        className="canvas-world"
        style={{
          width: worldBounds.maxX,
          height: worldBounds.maxY,
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
        }}
      >
        <article
          aria-label={
            selectedItemId === "source"
              ? t("{label}, выбрано", { label: t("Исходное изображение") })
              : t("Исходное изображение")
          }
          data-canvas-item
          className={`canvas-item ${
            selectedItemId === "source" ? "canvas-item--selected" : ""
          } ${tool === "select" ? "canvas-item--interactive" : ""}`}
          style={{
            left: SOURCE_X,
            top: SOURCE_Y,
            width: CARD_WIDTH,
          }}
          tabIndex={0}
          onClick={() => {
            selectItem("source");
            if (tool === "select") onActivateSource?.();
          }}
          onKeyDown={(event) => {
            if (
              event.target === event.currentTarget &&
              (event.key === "Enter" || event.key === " ")
            ) {
              event.preventDefault();
              selectItem("source");
              if (tool === "select") onActivateSource?.();
            }
          }}
        >
          <header
            className="flex shrink-0 items-center justify-between border-b border-border px-5"
            style={{ height: CARD_HEADER_HEIGHT }}
          >
            <div className="min-w-0">
              <p className="text-sm font-black">{t("Исходное изображение")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Разметка не изменяет оригинал")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectedItemId === "source" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                  {t("Выбран")}
                </span>
              ) : null}
              <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {t("Оригинал")}
              </span>
            </div>
          </header>
          <div
            className="relative overflow-hidden bg-black"
            style={{ aspectRatio: `${source.width} / ${source.height}` }}
          >
            {/* The source is rendered once; Fabric is a transparent layer above it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source.imageUrl}
              alt={t("Исходная фотография помещения")}
              className="absolute inset-0 size-full object-contain"
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <div className="absolute inset-0">
              <VisualPromptEditor
                ref={editorRef}
                projectId={source.projectId}
                editorWidth={source.width}
                editorHeight={source.height}
                sourceWidth={source.sourceWidth}
                sourceHeight={source.sourceHeight}
                initialState={source.initialState}
                tool={tool}
                color={color}
                strokeWidth={strokeWidth}
                onHistoryStateChange={onHistoryStateChange}
                onPersistenceStateChange={onEditorError}
              />
            </div>
          </div>
        </article>

        {generations.map((generation, index) => {
          const position = generationPositions[index];
          return (
            <article
              key={generation.id}
              aria-label={
                selectedItemId === generation.id
                  ? t("{label}, выбрано", {
                      label: generation.ariaLabel ?? t("Результат генерации"),
                    })
                  : generation.ariaLabel ?? t("Результат генерации")
              }
              data-canvas-item
              className={`canvas-item ${
                selectedItemId === generation.id ? "canvas-item--selected" : ""
              } ${
                tool === "select" && generation.interactive
                  ? "canvas-item--interactive"
                  : ""
              }`}
              style={{
                left: position.x,
                top: position.y,
                width: CARD_WIDTH,
                height: sourceCardHeight,
              }}
              tabIndex={0}
              onClick={() => {
                selectItem(generation.id);
              }}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  selectItem(generation.id);
                }
              }}
            >
              {generation.node}
            </article>
          );
        })}
      </div>

      {selectedGenerationOverlay && selectedGenerationOverlayPosition ? (
        <div
          className="canvas-generation-overlay"
          data-placement={selectedGenerationOverlayPosition.placement}
          style={{
            left: selectedGenerationOverlayPosition.left,
            top: selectedGenerationOverlayPosition.top,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {selectedGenerationOverlay}
        </div>
      ) : null}

      <div
        className="canvas-zoom-controls"
        aria-label={t("Масштаб холста")}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={t("Уменьшить масштаб")}
          title={t("Уменьшить масштаб")}
          disabled={transform.scale <= MIN_CANVAS_SCALE + 0.0001}
          onClick={() => zoomFromCenter(1 / CANVAS_ZOOM_STEP)}
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          className="canvas-zoom-controls__value"
          aria-label={t("Сбросить масштаб до 100%")}
          title={t("Сбросить масштаб до 100%")}
          onClick={resetZoom}
        >
          <span aria-live="polite">{Math.round(transform.scale * 100)}%</span>
        </button>
        <button
          type="button"
          aria-label={t("Увеличить масштаб")}
          title={t("Увеличить масштаб")}
          disabled={transform.scale >= MAX_CANVAS_SCALE - 0.0001}
          onClick={() => zoomFromCenter(CANVAS_ZOOM_STEP)}
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          aria-label={t("Показать выбранный объект")}
          title={t("Показать выбранный объект")}
          onClick={() => focusItem(selectedItemId)}
        >
          <Focus size={17} />
        </button>
        <button
          type="button"
          aria-label={t("Вписать содержимое")}
          title={t("Вписать содержимое")}
          onClick={fitToContent}
        >
          <Maximize2 size={17} />
        </button>
      </div>
    </div>
  );
});
