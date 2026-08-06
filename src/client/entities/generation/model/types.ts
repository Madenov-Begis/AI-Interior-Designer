export const INTERIOR_STYLE_CODES = [
  "modern",
  "japandi",
  "minimalism",
  "neoclassic",
  "loft",
  "scandinavian",
] as const;

export type InteriorStyleCode = (typeof INTERIOR_STYLE_CODES)[number];

export type InteriorStyle = {
  code: InteriorStyleCode;
  name: string;
  imageUrl: string;
  promptModifier: string;
};

export type GenerationWallet = {
  balance: number;
  generationCost: number;
};

export type GenerationSurface = "root" | "refinement";
export type GenerationActionSurface = "retry" | "variation";
