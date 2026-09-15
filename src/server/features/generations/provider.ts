import "server-only";

import sharp from "sharp";
import type { AiProvider, AspectRatio } from "@/generated/prisma/enums";
import { GENERATION_WEBP_OPTIONS } from "@/server/features/generations/generation-image";
import { VertexGeminiImageProvider } from "@/server/features/generations/vertex-provider";

export type ProviderImage = { data: Buffer; mimeType: string };
export type ProviderInput = {
  operation: "root" | "refinement";
  source: ProviderImage;
  references: ProviderImage[];
  prompt: string;
  aspectRatio: AspectRatio;
};
export type ProviderOutput = {
  image: Buffer;
  mimeType: "image/webp";
  width: number;
  height: number;
  providerRequestId: string;
};

export interface ImageGenerationProvider {
  generate(input: ProviderInput): Promise<ProviderOutput>;
}

function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}

export class FakeImageGenerationProvider implements ImageGenerationProvider {
  async generate(input: ProviderInput): Promise<ProviderOutput> {
    const label = escapeXml(input.prompt.replace(/\s+/g, " ").slice(0, 72));
    const metadata = await sharp(input.source.data).metadata();
    if (!metadata.width || !metadata.height)
      throw new Error("SOURCE_DIMENSIONS_MISSING");
    const bannerHeight = Math.max(72, Math.round(metadata.height * 0.08));
    const overlay = Buffer.from(
      `<svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#afea4d" stop-opacity="0.10"/><stop offset="1" stop-color="#4d7cff" stop-opacity="0.08"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect y="${metadata.height - bannerHeight}" width="100%" height="${bannerHeight}" fill="#101112" fill-opacity="0.78"/><text x="${Math.round(metadata.width * 0.03)}" y="${metadata.height - Math.round(bannerHeight * 0.38)}" fill="#afea4d" font-size="${Math.max(18, Math.round(bannerHeight * 0.3))}" font-family="Arial, sans-serif" font-weight="700">MOCK · ${label}</text></svg>`,
    );
    const image = await sharp(input.source.data)
      .rotate()
      .toColorspace("srgb")
      .composite([{ input: overlay, blend: "over" }])
      .webp(GENERATION_WEBP_OPTIONS)
      .toBuffer();
    return {
      image,
      mimeType: "image/webp",
      width: metadata.width,
      height: metadata.height,
      providerRequestId: `fake-${crypto.randomUUID()}`,
    };
  }
}

export function getImageGenerationProvider(
  provider: AiProvider,
  modelId: string,
  timeoutSeconds: number,
): ImageGenerationProvider {
  if (provider === "FAKE") return new FakeImageGenerationProvider();
  if (provider === "VERTEX_AI")
    return new VertexGeminiImageProvider(modelId, timeoutSeconds);
  throw new Error("AI_PROVIDER_NOT_SUPPORTED");
}
