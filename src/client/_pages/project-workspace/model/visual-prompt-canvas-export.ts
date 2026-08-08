export type CanvasPngExportOptions = {
  format: "png";
  multiplier: 1;
  enableRetinaScaling: false;
};

type CanvasPngExporter = {
  toBlob(options: CanvasPngExportOptions): Promise<Blob | null>;
};

export async function canvasToPngBlob(canvas: CanvasPngExporter) {
  const blob = await canvas.toBlob({
    format: "png",
    multiplier: 1,
    enableRetinaScaling: false,
  });

  if (!blob) throw new Error("Не удалось подготовить разметку");
  return blob;
}
