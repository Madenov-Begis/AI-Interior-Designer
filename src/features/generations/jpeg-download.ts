import sharp from "sharp";

export const JPEG_DOWNLOAD_QUALITY = 92;

export function convertGenerationDownloadToJpeg(input: Buffer) {
  return sharp(input, { failOn: "error" })
    .rotate()
    .toColorspace("srgb")
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: JPEG_DOWNLOAD_QUALITY })
    .toBuffer();
}

export function generationDownloadFilename(createdAt: Date) {
  return `interior-design-${createdAt.toISOString().slice(0, 10)}.jpg`;
}
