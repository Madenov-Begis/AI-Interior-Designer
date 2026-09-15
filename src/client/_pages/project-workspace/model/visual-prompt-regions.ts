import type { VisualPromptPlacementRegion } from "@/features/visual-prompt";

type PlacementObject = {
  type?: string;
  visible?: boolean;
  stroke?: unknown;
  fill?: unknown;
  globalCompositeOperation?: string;
  getBoundingRect?(): {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

type PixelRegion = VisualPromptPlacementRegion;

const DEFAULT_MARKUP_COLOR = "#afea4d";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function rounded(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function objectColor(object: PlacementObject) {
  const value =
    typeof object.stroke === "string"
      ? object.stroke
      : typeof object.fill === "string"
        ? object.fill
        : DEFAULT_MARKUP_COLOR;
  return value.trim().toLowerCase().slice(0, 32) || DEFAULT_MARKUP_COLOR;
}

function regionsTouch(
  first: PixelRegion,
  second: PixelRegion,
  gapX: number,
  gapY: number,
) {
  return (
    first.color === second.color &&
    first.left <= second.left + second.width + gapX &&
    second.left <= first.left + first.width + gapX &&
    first.top <= second.top + second.height + gapY &&
    second.top <= first.top + first.height + gapY
  );
}

function mergeRegions(first: PixelRegion, second: PixelRegion): PixelRegion {
  const left = Math.min(first.left, second.left);
  const top = Math.min(first.top, second.top);
  const right = Math.max(
    first.left + first.width,
    second.left + second.width,
  );
  const bottom = Math.max(
    first.top + first.height,
    second.top + second.height,
  );
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    color: first.color,
    kind:
      first.kind === "rectangle" && second.kind === "rectangle"
        ? "rectangle"
        : "stroke",
  };
}

function mergeConnectedRegions(
  regions: PixelRegion[],
  editorWidth: number,
  editorHeight: number,
) {
  const pending = [...regions];
  const merged: PixelRegion[] = [];
  const gapX = Math.max(2, editorWidth * 0.0025);
  const gapY = Math.max(2, editorHeight * 0.0025);

  while (pending.length > 0) {
    let region = pending.shift()!;
    let mergedAnother = true;
    while (mergedAnother) {
      mergedAnother = false;
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const candidate = pending[index];
        if (!candidate || !regionsTouch(region, candidate, gapX, gapY)) {
          continue;
        }
        region = mergeRegions(region, candidate);
        pending.splice(index, 1);
        mergedAnother = true;
      }
    }
    merged.push(region);
  }
  return merged;
}

export function placementRegionsFromObjects(
  objects: PlacementObject[],
  editorWidth: number,
  editorHeight: number,
): VisualPromptPlacementRegion[] {
  if (editorWidth <= 0 || editorHeight <= 0) return [];

  const pixelRegions = objects.flatMap((object): PixelRegion[] => {
    if (
      object.visible === false ||
      object.globalCompositeOperation === "destination-out" ||
      typeof object.getBoundingRect !== "function"
    ) {
      return [];
    }
    const bounds = object.getBoundingRect();
    if (
      !Number.isFinite(bounds.left) ||
      !Number.isFinite(bounds.top) ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      return [];
    }
    const left = clamp(bounds.left, 0, editorWidth);
    const top = clamp(bounds.top, 0, editorHeight);
    const right = clamp(bounds.left + bounds.width, 0, editorWidth);
    const bottom = clamp(bounds.top + bounds.height, 0, editorHeight);
    if (right <= left || bottom <= top) return [];

    return [
      {
        left,
        top,
        width: right - left,
        height: bottom - top,
        color: objectColor(object),
        kind:
          object.type?.toLowerCase() === "rect" ? "rectangle" : "stroke",
      },
    ];
  });

  return mergeConnectedRegions(pixelRegions, editorWidth, editorHeight)
    .map((region) => ({
      ...region,
      left: rounded(region.left / editorWidth),
      top: rounded(region.top / editorHeight),
      width: rounded(region.width / editorWidth),
      height: rounded(region.height / editorHeight),
    }))
    .sort(
      (first, second) =>
        first.top - second.top ||
        first.left - second.left ||
        first.height - second.height ||
        first.width - second.width,
    );
}
