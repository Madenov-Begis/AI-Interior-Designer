import type { VisualPromptPlacementRegion } from "@/server/features/visual-prompt/types";

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function placementSector(region: VisualPromptPlacementRegion) {
  const centerX = region.left + region.width / 2;
  const centerY = region.top + region.height / 2;
  const horizontal =
    centerX < 1 / 3 ? "левая" : centerX > 2 / 3 ? "правая" : "центральная";
  const vertical =
    centerY < 1 / 3 ? "верхняя" : centerY > 2 / 3 ? "нижняя" : "средняя";
  return `${vertical} ${horizontal} часть`;
}

export function formatPlacementRegions(
  regions: VisualPromptPlacementRegion[],
) {
  if (regions.length === 0) return "";
  const lines = regions.map((region, index) => {
    const right = region.left + region.width;
    const bottom = region.top + region.height;
    const centerX = region.left + region.width / 2;
    const centerY = region.top + region.height / 2;
    return `${index + 1}. ${placementSector(region)}; цвет исходной разметки ${region.color}; границы x=${percent(region.left)}–${percent(right)}, y=${percent(region.top)}–${percent(bottom)}; центр (${percent(centerX)}, ${percent(centerY)}).`;
  });
  return [
    "Координатные зоны визуальной разметки (нормализованы относительно чистого исходного изображения; начало координат — его левый верхний угол):",
    ...lines,
    "Размести запрошенные объекты и изменения внутри соответствующих зон. Любое упоминание пользователем круга, рамки, цвета или разметки относится к этим координатным зонам, а не к видимому элементу результата. Не рисуй линии, круги, рамки, заливку, маркеры или другие следы разметки.",
  ].join("\n");
}
