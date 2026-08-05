export const DEFAULT_PROJECT_NAME = "Новый интерьер";

export function projectNameFromSourceFile(fileName: string) {
  const baseName = fileName.trim().split(/[\\/]/).at(-1) ?? "";
  const withoutExtension = baseName.replace(/\.[^.]+$/, "");
  const normalized = Array.from(withoutExtension)
    .filter((character) => character >= " ")
    .join("")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
  return normalized || DEFAULT_PROJECT_NAME;
}
