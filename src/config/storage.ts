export const STORAGE_BUCKETS = {
  sourceImages: "source-images",
  visualPrompts: "visual-prompts",
  referenceImages: "reference-images",
  generationOriginals: "generation-originals",
  generationResults: "generation-results",
  branding: "branding",
} as const;

export const SOURCE_IMAGE_RULES = {
  maxBytes: 15 * 1024 * 1024,
  minWidth: 512,
  minHeight: 512,
  maxSide: 6000,
  previewMaxWidth: 1600,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

export const VISUAL_PROMPT_RULES = {
  maxOverlayBytes: 15 * 1024 * 1024,
  outputQuality: 92,
} as const;
