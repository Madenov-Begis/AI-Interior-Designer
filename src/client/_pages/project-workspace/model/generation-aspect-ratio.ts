export const GENERATION_ASPECT_RATIOS = [
  "RATIO_1_1",
  "RATIO_16_9",
  "RATIO_9_16",
  "RATIO_4_3",
  "RATIO_3_4",
] as const;

export type GenerationAspectRatio = (typeof GENERATION_ASPECT_RATIOS)[number];
export type GenerationAspectRatioSelection = "SOURCE" | GenerationAspectRatio;

export const GENERATION_ASPECT_RATIO_LABELS: Record<
  GenerationAspectRatio,
  string
> = {
  RATIO_1_1: "1:1",
  RATIO_16_9: "16:9",
  RATIO_9_16: "9:16",
  RATIO_4_3: "4:3",
  RATIO_3_4: "3:4",
};

const ASPECT_RATIO_VALUES: Record<GenerationAspectRatio, number> = {
  RATIO_1_1: 1,
  RATIO_16_9: 16 / 9,
  RATIO_9_16: 9 / 16,
  RATIO_4_3: 4 / 3,
  RATIO_3_4: 3 / 4,
};

export function nearestGenerationAspectRatio(
  width: number,
  height: number,
): GenerationAspectRatio {
  if (width <= 0 || height <= 0) return "RATIO_16_9";

  const sourceRatio = width / height;
  return GENERATION_ASPECT_RATIOS.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(
      Math.log(sourceRatio / ASPECT_RATIO_VALUES[nearest]),
    );
    const candidateDistance = Math.abs(
      Math.log(sourceRatio / ASPECT_RATIO_VALUES[candidate]),
    );
    return candidateDistance < nearestDistance ? candidate : nearest;
  });
}

export function resolveGenerationAspectRatio(
  selection: GenerationAspectRatioSelection,
  sourceWidth: number,
  sourceHeight: number,
): GenerationAspectRatio {
  return selection === "SOURCE"
    ? nearestGenerationAspectRatio(sourceWidth, sourceHeight)
    : selection;
}
