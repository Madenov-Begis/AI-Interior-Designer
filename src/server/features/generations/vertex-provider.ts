import "server-only";

import { Modality, type Part } from "@google/genai";
import sharp from "sharp";
import type { AspectRatio } from "@/generated/prisma/enums";
import type {
  ImageGenerationProvider,
  ProviderImage,
  ProviderInput,
  ProviderOutput,
} from "@/server/features/generations/provider";
import {
  GENERATION_IMAGE_SIZE,
  GENERATION_WEBP_OPTIONS,
} from "@/server/features/generations/generation-image";
import { INTERIOR_DESIGN_SYSTEM_PROMPT } from "@/server/features/generations/professional-system-prompt";
import { createVertexGenAi } from "@/server/shared/integrations/google/vertex-client";

const ASPECT_RATIOS: Record<AspectRatio, string> = {
  RATIO_1_1: "1:1",
  RATIO_16_9: "16:9",
  RATIO_9_16: "9:16",
  RATIO_4_3: "4:3",
  RATIO_3_4: "3:4",
};

function imagePart(image: ProviderImage): Part {
  return {
    inlineData: {
      data: image.data.toString("base64"),
      mimeType: image.mimeType,
    },
  };
}

function buildParts(input: ProviderInput): Part[] {
  const parts: Part[] = [
    {
      text:
        input.operation === "refinement"
          ? "The next image is the exact existing interior result selected by the user for editing. Modify this image according to the new user request. Preserve its exact dimensions, camera angle, perspective, composition, room geometry, and every unmentioned design detail. Do not redesign it from scratch, crop, rotate, mirror, or replace the room."
          : "The next image is the authoritative source photo of the room. Redesign this same room while preserving its exact camera angle, perspective, composition, walls, windows, doors, ceiling, and floor boundaries. Do not crop, rotate, mirror, or replace the room.",
    },
    imagePart(input.source),
  ];

  if (input.references.length > 0) {
    parts.push({
      text: "The following images are style, material, furniture, and object references. Use their relevant design ideas without copying their room geometry or camera viewpoint.",
    });
    input.references.forEach((reference, index) => {
      parts.push(
        { text: `Reference image ${index + 1}:` },
        imagePart(reference),
      );
    });
  }

  parts.push({
    text: `User design brief:\n${input.prompt}\n\nReturn one finished, photorealistic interior visualization only. The output must show the redesigned source room, without text, logos, borders, annotations, split screens, or a before/after collage.`,
  });
  return parts;
}

export class VertexGeminiImageProvider implements ImageGenerationProvider {
  constructor(
    private readonly modelId: string,
    private readonly timeoutSeconds: number,
  ) {}

  async generate(input: ProviderInput): Promise<ProviderOutput> {
    const ai = await createVertexGenAi(this.timeoutSeconds);
    const response = await ai.models.generateContent({
      model: this.modelId,
      contents: [{ role: "user", parts: buildParts(input) }],
      config: {
        systemInstruction: INTERIOR_DESIGN_SYSTEM_PROMPT,
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        imageConfig: {
          aspectRatio: ASPECT_RATIOS[input.aspectRatio],
          imageSize: GENERATION_IMAGE_SIZE,
          imageOutputOptions: { mimeType: "image/png" },
        },
      },
    });
    const generated = response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .find(
        (part) =>
          part.inlineData?.data &&
          part.inlineData.mimeType?.startsWith("image/"),
      )?.inlineData;
    if (!generated?.data) throw new Error("VERTEX_NO_IMAGE");

    const normalized = await sharp(Buffer.from(generated.data, "base64"))
      .rotate()
      .toColorspace("srgb")
      .webp(GENERATION_WEBP_OPTIONS)
      .toBuffer({ resolveWithObject: true });
    if (!normalized.info.width || !normalized.info.height)
      throw new Error("RESULT_DIMENSIONS_MISSING");
    return {
      image: normalized.data,
      mimeType: "image/webp",
      width: normalized.info.width,
      height: normalized.info.height,
      providerRequestId: response.responseId || `vertex-${crypto.randomUUID()}`,
    };
  }
}
