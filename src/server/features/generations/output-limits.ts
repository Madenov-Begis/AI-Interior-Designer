import sharp from "sharp";
import { GENERATION_WEBP_OPTIONS } from "./generation-image.ts";

type ImageOutput = {
  image: Buffer;
  mimeType: "image/webp";
  width: number;
  height: number;
};

export async function constrainOutputDimensions<TOutput extends ImageOutput>(
  output: TOutput,
  limits: { maxOutputWidth: number; maxOutputHeight: number },
): Promise<TOutput> {
  if (
    output.width <= limits.maxOutputWidth &&
    output.height <= limits.maxOutputHeight
  )
    return output;

  const resized = await sharp(output.image, { failOn: "error" })
    .rotate()
    .resize({
      width: limits.maxOutputWidth,
      height: limits.maxOutputHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColorspace("srgb")
    .webp(GENERATION_WEBP_OPTIONS)
    .toBuffer({ resolveWithObject: true });

  return {
    ...output,
    image: resized.data,
    mimeType: "image/webp",
    width: resized.info.width,
    height: resized.info.height,
  };
}
