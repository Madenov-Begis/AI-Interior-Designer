export type CanvasTransform = {
  x: number;
  y: number;
  scale: number;
};

export const MIN_CANVAS_SCALE = 0.05;
export const MAX_CANVAS_SCALE = 2.5;
export const CANVAS_ZOOM_STEP = 1.25;

export function clampCanvasScale(scale: number) {
  return Math.min(MAX_CANVAS_SCALE, Math.max(MIN_CANVAS_SCALE, scale));
}

export function zoomTransformAroundPoint(
  transform: CanvasTransform,
  requestedScale: number,
  point: { x: number; y: number },
): CanvasTransform {
  const scale = clampCanvasScale(requestedScale);
  const worldX = (point.x - transform.x) / transform.scale;
  const worldY = (point.y - transform.y) / transform.scale;

  return {
    scale,
    x: point.x - worldX * scale,
    y: point.y - worldY * scale,
  };
}

export function canvasWheelAction(input: {
  deltaX: number;
  deltaY: number;
  zoomModifier: boolean;
  preferHorizontal: boolean;
}) {
  if (input.zoomModifier) {
    return {
      type: "zoom" as const,
      factor: Math.exp(-input.deltaY * 0.0015),
    };
  }

  if (
    input.preferHorizontal &&
    Math.abs(input.deltaX) < Math.abs(input.deltaY) * 0.25
  ) {
    return { type: "pan" as const, deltaX: input.deltaY, deltaY: 0 };
  }

  return {
    type: "pan" as const,
    deltaX: input.deltaX,
    deltaY: input.deltaY,
  };
}
