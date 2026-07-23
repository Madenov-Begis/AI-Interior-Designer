export const INTERIOR_STYLE_CODES = [
  "modern",
  "japandi",
  "minimalism",
  "neoclassic",
  "loft",
  "scandinavian",
] as const;

export type InteriorStyleCode = (typeof INTERIOR_STYLE_CODES)[number];

export const INTERIOR_STYLES = [
  {
    code: "modern",
    name: "Современный",
    imageUrl: "/images/interior-styles/modern.webp",
    promptModifier:
      "Стиль: современный интерьер с чистыми линиями, функциональной мебелью, спокойной нейтральной палитрой и лаконичными деталями.",
  },
  {
    code: "japandi",
    name: "Джапанди",
    imageUrl: "/images/interior-styles/japandi.webp",
    promptModifier:
      "Стиль: джапанди с натуральным деревом, тёплыми нейтральными оттенками, низкой мебелью и спокойной минималистичной композицией.",
  },
  {
    code: "minimalism",
    name: "Минимализм",
    imageUrl: "/images/interior-styles/minimalism.webp",
    promptModifier:
      "Стиль: минимализм с простыми формами, свободным пространством, скрытым хранением и ограниченной светлой палитрой.",
  },
  {
    code: "neoclassic",
    name: "Неоклассика",
    imageUrl: "/images/interior-styles/neoclassic.webp",
    promptModifier:
      "Стиль: современная неоклассика с симметрией, деликатными молдингами, благородными материалами и сдержанной элегантностью.",
  },
  {
    code: "loft",
    name: "Лофт",
    imageUrl: "/images/interior-styles/loft.webp",
    promptModifier:
      "Стиль: лофт с фактурным кирпичом или бетоном, металлом, тёмными акцентами и открытыми выразительными материалами.",
  },
  {
    code: "scandinavian",
    name: "Скандинавский",
    imageUrl: "/images/interior-styles/scandinavian.webp",
    promptModifier:
      "Стиль: скандинавский интерьер со светлым деревом, мягким естественным светом, практичной мебелью и уютным текстилем.",
  },
] as const satisfies ReadonlyArray<{
  code: InteriorStyleCode;
  name: string;
  imageUrl: string;
  promptModifier: string;
}>;

export function getInteriorStyle(code: InteriorStyleCode | undefined) {
  return code ? INTERIOR_STYLES.find((style) => style.code === code) : undefined;
}
