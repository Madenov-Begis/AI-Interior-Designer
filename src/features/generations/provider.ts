import "server-only";

import sharp from "sharp";

export type ProviderInput = { source: Buffer; prompt: string; width: number; height: number };
export type ProviderOutput = { image: Buffer; mimeType: "image/webp"; providerRequestId: string };

export interface ImageGenerationProvider {
  generate(input: ProviderInput): Promise<ProviderOutput>;
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
}

export class FakeImageGenerationProvider implements ImageGenerationProvider {
  async generate(input: ProviderInput): Promise<ProviderOutput> {
    const label = escapeXml(input.prompt.replace(/\s+/g, " ").slice(0, 72));
    const bannerHeight = Math.max(72, Math.round(input.height * 0.08));
    const overlay = Buffer.from(`<svg width="${input.width}" height="${input.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#afea4d" stop-opacity="0.10"/><stop offset="1" stop-color="#4d7cff" stop-opacity="0.08"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect y="${input.height - bannerHeight}" width="100%" height="${bannerHeight}" fill="#101112" fill-opacity="0.78"/><text x="${Math.round(input.width * 0.03)}" y="${input.height - Math.round(bannerHeight * 0.38)}" fill="#afea4d" font-size="${Math.max(18, Math.round(bannerHeight * 0.3))}" font-family="Arial, sans-serif" font-weight="700">MOCK · ${label}</text></svg>`);
    const image = await sharp(input.source).rotate().toColorspace("srgb").composite([{ input: overlay, blend: "over" }]).webp({ quality: 92 }).toBuffer();
    return { image, mimeType: "image/webp", providerRequestId: `fake-${crypto.randomUUID()}` };
  }
}

export function getImageGenerationProvider(): ImageGenerationProvider {
  if ((process.env.AI_PROVIDER ?? "fake") === "fake") return new FakeImageGenerationProvider();
  throw new Error("VERTEX_PROVIDER_NOT_CONFIGURED");
}
