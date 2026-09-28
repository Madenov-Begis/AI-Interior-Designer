import sharp from "sharp";
import type { RawProviderOutput, ProviderOutput } from "./provider";
import { GENERATION_WEBP_OPTIONS } from "./generation-image";

export async function normalizeProviderOutput(raw: RawProviderOutput): Promise<ProviderOutput> {
  const normalized = await sharp(raw.image).rotate().toColorspace("srgb")
    .webp(GENERATION_WEBP_OPTIONS).toBuffer({ resolveWithObject: true });
  if (!normalized.info.width || !normalized.info.height) throw new Error("RESULT_DIMENSIONS_MISSING");
  return { image: normalized.data, mimeType: "image/webp", width: normalized.info.width,
    height: normalized.info.height, providerRequestId: raw.providerRequestId };
}
