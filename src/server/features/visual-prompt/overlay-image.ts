import sharp from "sharp";

export function prepareVisualPromptOverlay(
  overlay: Buffer,
  width: number,
  height: number,
) {
  return sharp(overlay).resize(width, height, { fit: "fill" }).png().toBuffer();
}
