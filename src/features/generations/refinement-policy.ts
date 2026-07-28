export type RefinementAspectRatio =
  | "RATIO_1_1"
  | "RATIO_16_9"
  | "RATIO_9_16"
  | "RATIO_4_3"
  | "RATIO_3_4";

type RefinementParent = {
  id: string;
  projectId: string;
  modelId: string;
  styleCode: string | null;
  aspectRatio: RefinementAspectRatio;
  resultOriginalId: string | null;
  status: string;
};

export function buildRefinementSnapshot(parent: RefinementParent) {
  if (parent.status !== "SUCCEEDED") {
    throw new Error("GENERATION_NOT_REFINABLE");
  }
  if (!parent.resultOriginalId) {
    throw new Error("GENERATION_RESULT_MISSING");
  }

  return {
    parentGenerationId: parent.id,
    projectId: parent.projectId,
    modelId: parent.modelId,
    styleCode: parent.styleCode,
    aspectRatio: parent.aspectRatio,
    sourceImageId: parent.resultOriginalId,
  };
}
