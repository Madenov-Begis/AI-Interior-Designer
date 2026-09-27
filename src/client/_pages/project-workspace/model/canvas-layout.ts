import type { CanvasTransform } from "./canvas-navigation";

export type CanvasSize = { width: number; height: number };
export type CanvasPoint = { x: number; y: number };
export type CanvasBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};
export type CanvasInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
export type ContainedMediaRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const SOURCE_X = 80;
export const SOURCE_Y = 80;
export const CARD_WIDTH = 760;
export const CARD_GAP = 72;
export const RESULT_CARD_HEIGHT = 610;
export const CARD_HEADER_HEIGHT = 70;

export function canvasCardHeight(
  width: number | null | undefined,
  height: number | null | undefined,
) {
  if (!width || !height || width <= 0 || height <= 0) {
    return RESULT_CARD_HEIGHT;
  }
  return CARD_HEADER_HEIGHT + (CARD_WIDTH * height) / width;
}

export function containedMediaRect(
  frameWidth: number | null | undefined,
  frameHeight: number | null | undefined,
  mediaWidth: number | null | undefined,
  mediaHeight: number | null | undefined,
): ContainedMediaRect {
  if (
    !frameWidth ||
    !frameHeight ||
    !mediaWidth ||
    !mediaHeight ||
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    mediaWidth <= 0 ||
    mediaHeight <= 0
  ) {
    return { left: 0, top: 0, width: 100, height: 100 };
  }

  const frameAspectRatio = frameWidth / frameHeight;
  const mediaAspectRatio = mediaWidth / mediaHeight;
  if (mediaAspectRatio > frameAspectRatio) {
    const height = (frameAspectRatio / mediaAspectRatio) * 100;
    return { left: 0, top: (100 - height) / 2, width: 100, height };
  }

  const width = (mediaAspectRatio / frameAspectRatio) * 100;
  return { left: (100 - width) / 2, top: 0, width, height: 100 };
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

export function constrainCanvasTransform(
  transform: CanvasTransform,
  viewport: CanvasSize,
  bounds: CanvasBounds,
  insets: CanvasInsets,
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

export function canvasViewportInsets(width: number): CanvasInsets {
  if (width < 1200) {
    return { top: 64, right: 40, bottom: 80, left: 40 };
  }
  return { top: 40, right: 40, bottom: 64, left: 72 };
}

export function generationPosition(index: number): CanvasPoint {
  return {
    x: SOURCE_X + (index + 1) * (CARD_WIDTH + CARD_GAP),
    y: SOURCE_Y,
  };
}

export type CanvasLayoutItem = {
  id?: string;
  parentGenerationId?: string | null;
  height?: number;
};

export type CalculateCanvasLayoutOptions = {
  generations?: CanvasLayoutItem[];
  generationHeights?: Array<number | undefined>;
  sourceCardHeight: number;
  viewportWidth?: number;
};

export function calculateCanvasLayout({
  generations,
  generationHeights,
  sourceCardHeight,
}: CalculateCanvasLayoutOptions) {
  const items: CanvasLayoutItem[] =
    generations ??
    generationHeights?.map((height) => ({ height })) ??
    [];

  const positionsById = new Map<string, CanvasPoint>();
  const maxYByX = new Map<number, number>();

  let nextRootIndex = 0;
  const generationPositions: CanvasPoint[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const itemHeight = item.height ?? RESULT_CARD_HEIGHT;
    const parentId = item.parentGenerationId;
    const parentPos = parentId ? positionsById.get(parentId) : undefined;

    let x: number;
    let y: number;

    if (parentPos) {
      // Доработка: размещается в колонке родителя вертикально вниз
      x = parentPos.x;
      const currentMaxY = maxYByX.get(x) ?? (parentPos.y + itemHeight);
      y = currentMaxY + CARD_GAP;
      maxYByX.set(x, y + itemHeight);
    } else {
      // Новая корневая генерация: идёт горизонтально вправо
      x = SOURCE_X + (nextRootIndex + 1) * (CARD_WIDTH + CARD_GAP);
      y = SOURCE_Y;
      nextRootIndex++;
      maxYByX.set(x, y + itemHeight);
    }

    const point: CanvasPoint = { x, y };
    generationPositions.push(point);
    if (item.id) {
      positionsById.set(item.id, point);
    }
  }

  let maxX = SOURCE_X + CARD_WIDTH;
  let maxY = SOURCE_Y + sourceCardHeight;
  generationPositions.forEach((position, index) => {
    const itemHeight = items[index]?.height ?? RESULT_CARD_HEIGHT;
    maxX = Math.max(maxX, position.x + CARD_WIDTH);
    maxY = Math.max(maxY, position.y + itemHeight);
  });

  return {
    generationPositions,
    worldBounds: {
      minX: 0,
      minY: 0,
      maxX: maxX + SOURCE_X,
      maxY: maxY + SOURCE_Y,
    } satisfies CanvasBounds,
  };
}
