import sharp from "sharp";
import { GENERATION_WEBP_OPTIONS } from "./generation-image.ts";

export async function normalizeRefinementOutput(
  image: Buffer,
  width: number,
  height: number,
) {
  const normalized = await sharp(image, { failOn: "error" })
    .rotate()
    .resize(width, height, { fit: "fill" })
    .toColorspace("srgb")
    .webp(GENERATION_WEBP_OPTIONS)
    .toBuffer();

  return {
    image: normalized,
    mimeType: "image/webp" as const,
    width,
    height,
  };
}
