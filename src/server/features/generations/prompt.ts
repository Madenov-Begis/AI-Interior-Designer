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
  parts.push("Не добавляй текст и логотипы в AI-изображение.");
  return parts.join("\n\n");
}

export function buildRefinementPrompt(input: {
  prompt: string;
  visualPromptUsed: boolean;
  referenceCount: number;
}) {
  const parts = [
    "Доработай именно переданное готовое изображение интерьера, а не создавай новый дизайн с нуля.",
    "Выполни только изменения, которые прямо указал пользователь. Всё остальное сохрани максимально неизменным: размеры изображения, ракурс, перспективу, геометрию помещения, расположение объектов, материалы, цвета, свет и декор.",
    input.prompt.trim(),
  ];
  if (input.visualPromptUsed) {
    parts.push(
      "Разметка указывает области доработки. Не переноси линии, выделения или элементы разметки в результат.",
    );
  }
  if (input.referenceCount > 0) {
    parts.push(
      `Используй только ${input.referenceCount} новых референсов, добавленных для этой доработки, и только в рамках запроса пользователя.`,
    );
  }
  parts.push(
    "Верни одно доработанное фотореалистичное изображение без текста, логотипов и рамок.",
  );
  return parts.join("\n\n");
}
