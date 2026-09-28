import "server-only";

import sharp from "sharp";
import { createHash } from "node:crypto";
import { normalizeProviderOutput } from "./provider-output";
import type { AiProvider, AspectRatio } from "@/generated/prisma/enums";
import { GENERATION_WEBP_OPTIONS } from "@/server/features/generations/generation-image";
import { VertexGeminiImageProvider } from "@/server/features/generations/vertex-provider";

export type ProviderImage = { data: Buffer; mimeType: string };
export type ProviderInput = {
  operation: "root" | "refinement";
  generationId?: string;
  providerAttempt?: number;
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

export type RawProviderOutput = { image: Buffer; mimeType: string; providerRequestId: string };

export interface ImageGenerationProvider {
  generateRaw(input: ProviderInput): Promise<RawProviderOutput>;
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
    return normalizeProviderOutput(await this.generateRaw(input));
  }
  async generateRaw(input: ProviderInput): Promise<RawProviderOutput> {
    const scenario = process.env.FAKE_SCENARIO || "normal";
    if (scenario !== "normal") {
      if (process.env.LOAD_TEST_MODE !== "true" || process.env.AI_PROVIDER !== "fake") throw new Error("FAKE_SCENARIO_FORBIDDEN");
      const seed = createHash("sha256").update(input.generationId || input.prompt).digest().readUInt32BE(0);
      if (scenario === "429" && (input.providerAttempt || 1) < 3) {
        throw Object.assign(new Error("FAKE_THROTTLED"), { status: 429, retryAfter: "1" });
      }
      const delay = scenario === "burst" ? 40_000 - Date.now() % 40_000 : 15_000 + seed % 25_001;
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (scenario === "timeout") throw new Error("FAKE_TIMEOUT");
      const image = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: seed % 256, g: (seed >>> 8) % 256, b: (seed >>> 16) % 256 } } }).png().toBuffer();
      return { image, mimeType: "image/png", providerRequestId: `fake-${crypto.randomUUID()}` };
    }
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
