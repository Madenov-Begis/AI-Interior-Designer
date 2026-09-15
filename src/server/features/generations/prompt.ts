import "server-only";

import type { VisualPromptPlacementRegion } from "@/server/features/visual-prompt/types";
import { formatPlacementRegions } from "./placement-prompt.ts";
import type { RoomTypeSnapshot } from "../rooms/types.ts";

type PromptInput = {
  prompt: string;
  visualPromptUsed: boolean;
  referenceCount: number;
  placementRegions?: VisualPromptPlacementRegion[];
  room?: RoomTypeSnapshot;
};

export function buildFinalPrompt(input: {
  prompt: PromptInput["prompt"];
  visualPromptUsed: PromptInput["visualPromptUsed"];
  referenceCount: PromptInput["referenceCount"];
  placementRegions?: PromptInput["placementRegions"];
  stylePrompt?: string;
  room?: PromptInput["room"];
}) {
  const parts = [
    "Создай фотореалистичный редизайн интерьера по исходной фотографии.",
    "Строго сохрани ракурс камеры, геометрию помещения, стены, окна, двери и пропорции.",
    input.prompt.trim(),
  ];
  if (input.room) {
    parts.push(`Тип помещения: ${input.room.name}.\n${input.room.promptModifier}`);
  }
  if (input.stylePrompt) parts.push(input.stylePrompt);
  if (input.visualPromptUsed) {
    const placementInstructions = formatPlacementRegions(
      input.placementRegions ?? [],
    );
    if (placementInstructions) parts.push(placementInstructions);
  }
  if (input.referenceCount > 0)
    parts.push(
      `Используй ${input.referenceCount} референсов в переданном порядке для стиля, материалов, мебели и декора.`,
    );
  parts.push("Не добавляй текст и логотипы в AI-изображение.");
  return parts.join("\n\n");
}

export function buildRefinementPrompt(input: PromptInput) {
  const parts = [
    "Доработай именно переданное готовое изображение интерьера, а не создавай новый дизайн с нуля.",
    "Выполни только изменения, которые прямо указал пользователь. Всё остальное сохрани максимально неизменным: размеры изображения, ракурс, перспективу, геометрию помещения, расположение объектов, материалы, цвета, свет и декор.",
    input.prompt.trim(),
  ];
  if (input.room) {
    parts.push(`Тип помещения: ${input.room.name}.\n${input.room.promptModifier}`);
  }
  if (input.visualPromptUsed) {
    const placementInstructions = formatPlacementRegions(
      input.placementRegions ?? [],
    );
    if (placementInstructions) parts.push(placementInstructions);
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
