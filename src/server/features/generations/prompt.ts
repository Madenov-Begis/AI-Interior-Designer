import "server-only";

export function buildFinalPrompt(input: {
  prompt: string;
  visualPromptUsed: boolean;
  referenceCount: number;
  stylePrompt?: string;
}) {
  const parts = [
    "Создай фотореалистичный редизайн интерьера по исходной фотографии.",
    "Строго сохрани ракурс камеры, геометрию помещения, стены, окна, двери и пропорции.",
    input.prompt.trim(),
  ];
  if (input.stylePrompt) parts.push(input.stylePrompt);
  if (input.visualPromptUsed)
    parts.push(
      "Учитывай цветную визуальную разметку как указание зон, которые требуется изменить.",
    );
  if (input.referenceCount > 0)
    parts.push(
      `Используй ${input.referenceCount} референсов в переданном порядке для стиля, материалов, мебели и декора.`,
    );
  parts.push("Не добавляй текст, логотипы и водяные знаки в AI-изображение.");
  return parts.join("\n\n");
}
