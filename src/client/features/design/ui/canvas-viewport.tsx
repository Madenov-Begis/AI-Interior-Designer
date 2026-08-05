"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
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
import { VisualPromptEditor } from "@/client/features/design/ui/visual-prompt-editor";
import type {
  VisualPromptCanvasState,
  VisualPromptEditorHandle,
  VisualPromptTool,
} from "@/client/features/visual-prompt/types";
import {
  positionFloatingOverlay,
  screenRectForWorldItem,
} from "@/client/features/canvas/model/overlay-position";

type ViewportTransform = { x: number; y: number; scale: number };
type ViewportSize = { width: number; height: number };
type WorldBounds = { minX: number; minY: number; maxX: number; maxY: number };
type ViewportInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 2.5;
export const SOURCE_X = 80;
export const SOURCE_Y = 80;
export const CARD_WIDTH = 760;
export const CARD_GAP = 72;

const RESULT_CARD_HEIGHT = 610;
const FIT_MIN_SCALE = 0.01;

export type CanvasViewportHandle = {
  zoomIn(): void;
  zoomOut(): void;
  fitToContent(): void;
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
  height?: number;
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

export function generationPosition(index: number) {
  return {
    x: SOURCE_X + (index + 1) * (CARD_WIDTH + CARD_GAP),
    y: SOURCE_Y,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function constrainAxis(
  offset: number,
  viewportLength: number,
  contentMinimum: number,
  contentMaximum: number,
  scale: number,
  leadingInset: number,
  trailingInset: number,
) {
  const trailingEdgeOffset =
    viewportLength - trailingInset - contentMaximum * scale;
  const leadingEdgeOffset = leadingInset - contentMinimum * scale;
  return clamp(
    offset,
    Math.min(trailingEdgeOffset, leadingEdgeOffset),
    Math.max(trailingEdgeOffset, leadingEdgeOffset),
  );
}

function constrainTransform(
  transform: ViewportTransform,
  viewport: ViewportSize,
  bounds: WorldBounds,
  insets: ViewportInsets,
) {
  return {
    ...transform,
    x: constrainAxis(
      transform.x,
      viewport.width,
      bounds.minX,
      bounds.maxX,
      transform.scale,
      insets.left,
      insets.right,
    ),
    y: constrainAxis(
      transform.y,
      viewport.height,
      bounds.minY,
      bounds.maxY,
      transform.scale,
      insets.top,
      insets.bottom,
    ),
  };
}

function getViewportInsets(width: number): ViewportInsets {
  if (width < 1200) {
    return { top: 64, right: 40, bottom: 80, left: 40 };
  }
  return { top: 40, right: 40, bottom: 64, left: 72 };
}

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
    () => getViewportInsets(viewportSize.width),
    [viewportSize.width],
  );

  const sourceCardHeight = 46 + (CARD_WIDTH * source.height) / source.width;
  const wrappedColumnCount =
    generations.length > 4
      ? clamp(
          Math.floor(
            Math.max(0, viewportSize.width - SOURCE_X * 2) /
              (CARD_WIDTH + CARD_GAP),
          ),
          1,
          4,
        )
      : Math.max(1, generations.length);
  const tallestGeneration = Math.max(
    RESULT_CARD_HEIGHT,
    ...generations.map((generation) => generation.height ?? RESULT_CARD_HEIGHT),
  );
  const rowHeight = Math.max(sourceCardHeight, tallestGeneration) + CARD_GAP;

  const generationPositions = useMemo(
    () =>
      generations.map((_, index) => {
        if (generations.length <= 4) return generationPosition(index);
        return {
          x:
            SOURCE_X +
            CARD_WIDTH +
            CARD_GAP +
            (index % wrappedColumnCount) * (CARD_WIDTH + CARD_GAP),
          y: SOURCE_Y + Math.floor(index / wrappedColumnCount) * rowHeight,
        };
      }),
    [generations, rowHeight, wrappedColumnCount],
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
          height:
            generations[selectedGenerationIndex]?.height ?? RESULT_CARD_HEIGHT,
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

  const worldBounds = useMemo<WorldBounds>(() => {
    let maxX = SOURCE_X + CARD_WIDTH;
    let maxY = SOURCE_Y + sourceCardHeight;

    generationPositions.forEach((position, index) => {
      maxX = Math.max(maxX, position.x + CARD_WIDTH);
      maxY = Math.max(
        maxY,
        position.y + (generations[index]?.height ?? RESULT_CARD_HEIGHT),
      );
    });

    return {
      minX: 0,
      minY: 0,
      maxX: maxX + SOURCE_X,
      maxY: maxY + SOURCE_Y,
    };
  }, [generationPositions, generations, sourceCardHeight]);

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
    const nextScale = clamp(
      Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
      FIT_MIN_SCALE,
      MAX_SCALE,
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

  const zoomBy = useCallback(
    (factor: number, pointerX: number, pointerY: number) => {
      setTransform((current) => {
        const scale = clamp(
          current.scale * factor,
          Math.min(MIN_SCALE, current.scale),
          MAX_SCALE,
        );
        const worldX = (pointerX - current.x) / current.scale;
        const worldY = (pointerY - current.y) / current.scale;
        return constrainTransform(
          {
            scale,
            x: pointerX - worldX * scale,
            y: pointerY - worldY * scale,
          },
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

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomFromCenter(1.2),
      zoomOut: () => zoomFromCenter(1 / 1.2),
      fitToContent,
    }),
    [fitToContent, zoomFromCenter],
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
    fitToContent();
  }, [fitToContent, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (!initialFitRef.current) return;
    setTransform((current) =>
      constrainTransform(current, viewportSize, worldBounds, viewportInsets),
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
      const normalizedDelta = event.deltaY * modeMultiplier;
      const factor = Math.exp(-normalizedDelta * 0.0015);

      zoomBy(factor, event.clientX - rect.left, event.clientY - rect.top);
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [zoomBy]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      tool !== "select" ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest("[data-canvas-item]")) {
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
      constrainTransform(
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

  return (
    <div
      ref={viewportRef}
      className={`canvas-viewport ${
        isPanning ? "canvas-viewport--panning" : ""
      }`}
      aria-label="Холст проекта"
      aria-describedby="canvas-viewport-instructions"
      role="region"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPan}
      onPointerCancel={finishPan}
    >
      <p id="canvas-viewport-instructions" className="sr-only">
        Инструмент со стрелкой выбирает объекты и перемещает холст
        перетаскиванием свободной области. Используйте кнопки масштаба, чтобы
        приблизить, отдалить или вписать всё содержимое.
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
          aria-label={`Исходное изображение${
            selectedItemId === "source" ? ", выбрано" : ""
          }`}
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
          <header className="flex h-[46px] items-center justify-between border-b border-border px-4">
            <div>
              <p className="text-sm font-black">Исходное изображение</p>
              <p className="text-[11px] text-muted">
                Разметка не изменяет оригинал
              </p>
            </div>
            <span className="rounded-full bg-surface-elevated px-2.5 py-1 text-[10px] font-bold text-muted">
              Оригинал
            </span>
          </header>
          <div
            className="relative overflow-hidden bg-black"
            style={{ aspectRatio: `${source.width} / ${source.height}` }}
          >
            {/* The source is rendered once; Fabric is a transparent layer above it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source.imageUrl}
              alt="Исходная фотография помещения"
              className="absolute inset-0 size-full object-fill"
              draggable={false}
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
              aria-label={`${generation.ariaLabel ?? "Результат генерации"}${
                selectedItemId === generation.id ? ", выбрано" : ""
              }`}
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
                height: generation.height ?? RESULT_CARD_HEIGHT,
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
        aria-label="Масштаб холста"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Уменьшить масштаб"
          title="Уменьшить масштаб"
          onClick={() => zoomFromCenter(1 / 1.2)}
        >
          <Minus size={18} />
        </button>
        <span aria-live="polite">{Math.round(transform.scale * 100)}%</span>
        <button
          type="button"
          aria-label="Увеличить масштаб"
          title="Увеличить масштаб"
          onClick={() => zoomFromCenter(1.2)}
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          aria-label="Вписать содержимое"
          title="Вписать содержимое"
          onClick={fitToContent}
        >
          <Maximize2 size={17} />
        </button>
      </div>
    </div>
  );
});
