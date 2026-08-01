import "server-only";

import { access } from "node:fs/promises";
import { GoogleGenAI, Modality, type Part } from "@google/genai";
import sharp from "sharp";
import type { AspectRatio } from "@/generated/prisma/enums";
import type {
  ImageGenerationProvider,
  ProviderImage,
  ProviderInput,
  ProviderOutput,
} from "@/features/generations/provider";
import { parseVertexCredentials } from "@/features/generations/vertex-auth";

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
      text: "The next image is the authoritative source photo of the room. Redesign this same room while preserving its exact camera angle, perspective, composition, walls, windows, doors, ceiling, and floor boundaries. Do not crop, rotate, mirror, or replace the room.",
    },
    imagePart(input.source),
  ];

  if (input.visualPrompt) {
    parts.push(
      {
        text: "The next image is an annotated copy of the source. Treat its markings and labels as design instructions, but do not render any arrows, strokes, labels, or editing UI in the result.",
      },
      imagePart(input.visualPrompt),
    );
  }

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
    text: `User design brief:\n${input.prompt}\n\nReturn one finished, photorealistic interior visualization only. The output must show the redesigned source room, without text, borders, watermarks, annotations, split screens, or a before/after collage.`,
  });
  return parts;
}

async function readVertexConfig() {
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID?.trim();
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || "global";
  const credentialsJson =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!project || (!credentialsJson && !credentialsPath)) {
    throw new Error("VERTEX_PROVIDER_NOT_CONFIGURED");
  }
  if (credentialsJson) {
    return {
      project,
      location,
      googleAuthOptions: {
        credentials: parseVertexCredentials(credentialsJson),
      },
    };
  }
  try {
    await access(credentialsPath!);
  } catch {
    throw new Error("VERTEX_CREDENTIALS_NOT_FOUND");
  }
  return { project, location, googleAuthOptions: undefined };
}

export class VertexGeminiImageProvider implements ImageGenerationProvider {
  constructor(
    private readonly modelId: string,
    private readonly timeoutSeconds: number,
  ) {}

  async generate(input: ProviderInput): Promise<ProviderOutput> {
    const { project, location, googleAuthOptions } = await readVertexConfig();
    const ai = new GoogleGenAI({
      vertexai: true,
      project,
      location,
      googleAuthOptions,
      apiVersion: "v1",
      httpOptions: { timeout: this.timeoutSeconds * 1000 },
    });
    const response = await ai.models.generateContent({
      model: this.modelId,
      contents: [{ role: "user", parts: buildParts(input) }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        imageConfig: { aspectRatio: ASPECT_RATIOS[input.aspectRatio] },
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
      .webp({ quality: 92 })
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
