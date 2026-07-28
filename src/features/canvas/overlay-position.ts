export type ScreenRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type Size = {
  width: number;
  height: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function screenRectForWorldItem(input: {
  item: { x: number; y: number; width: number; height: number };
  transform: { x: number; y: number; scale: number };
}): ScreenRect {
  const left = input.transform.x + input.item.x * input.transform.scale;
  const top = input.transform.y + input.item.y * input.transform.scale;
  const width = input.item.width * input.transform.scale;
  const height = input.item.height * input.transform.scale;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function positionFloatingOverlay(input: {
  anchor: ScreenRect;
  viewport: Size;
  overlay: Size;
  margin: number;
  gap: number;
}) {
  const maximumLeft = Math.max(
    input.margin,
    input.viewport.width - input.overlay.width - input.margin,
  );
  const left = clamp(
    input.anchor.left + (input.anchor.width - input.overlay.width) / 2,
    input.margin,
    maximumLeft,
  );
  const belowTop = input.anchor.bottom + input.gap;
  const fitsBelow =
    belowTop + input.overlay.height <= input.viewport.height - input.margin;
  const placement = fitsBelow ? "below" : "above";
  const preferredTop = fitsBelow
    ? belowTop
    : input.anchor.top - input.gap - input.overlay.height;
  const maximumTop = Math.max(
    input.margin,
    input.viewport.height - input.overlay.height - input.margin,
  );

  return {
    left,
    top: clamp(preferredTop, input.margin, maximumTop),
    placement,
  } as const;
}
