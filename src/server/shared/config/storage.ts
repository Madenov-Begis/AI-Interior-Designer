export const STORAGE_BUCKETS = {
  stagingUploads: "staging-uploads",
  sourceImages: "source-images",
  visualPrompts: "visual-prompts",
  referenceImages: "reference-images",
  generationOriginals: "generation-originals",
  generationResults: "generation-results",
  branding: "branding",
} as const;

export const SOURCE_IMAGE_RULES = {
  minWidth: 512,
  minHeight: 512,
  maxSide: 6000,
  previewMaxWidth: 1600,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

export const VISUAL_PROMPT_RULES = {
  outputQuality: 92,
} as const;

export const REFERENCE_IMAGE_RULES = {
  minWidth: 128,
  minHeight: 128,
  maxSide: 6000,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;
