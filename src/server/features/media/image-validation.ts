import "server-only";

import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { REFERENCE_IMAGE_RULES, SOURCE_IMAGE_RULES } from "@/server/shared/config/storage";
import { getSystemLimits } from "@/server/shared/config/system-limits";

export class ImageValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export type ValidatedSourceImage = {
  normalized: Buffer;
  preview: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
  checksum: string;
  originalName: string;
};

export async function validateSourceImage(
  file: File,
): Promise<ValidatedSourceImage> {
  const limits = getSystemLimits();
  if (file.size <= 0)
    throw new ImageValidationError("IMAGE_EMPTY", "Файл пуст");
  if (file.size > limits.maxUploadSizeBytes)
    throw new ImageValidationError(
      "IMAGE_TOO_LARGE",
      `Файл превышает ${limits.maxUploadSizeMb} МБ`,
    );

  const input = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(input);
  if (
    !detected ||
    !SOURCE_IMAGE_RULES.allowedMimeTypes.includes(detected.mime as never)
  ) {
    throw new ImageValidationError(
      "IMAGE_FORMAT_UNSUPPORTED",
      "Поддерживаются только JPG, PNG и WEBP",
    );
  }
  if (file.type && file.type !== detected.mime)
    throw new ImageValidationError(
      "IMAGE_MIME_MISMATCH",
      "Тип файла не совпадает с его содержимым",
    );

  try {
    const metadata = await sharp(input, { failOn: "error" })
      .rotate()
      .metadata();
    const width = metadata.autoOrient.width ?? metadata.width;
    const height = metadata.autoOrient.height ?? metadata.height;
    if (!width || !height)
      throw new ImageValidationError(
        "IMAGE_DIMENSIONS_UNKNOWN",
        "Не удалось определить размеры изображения",
      );
    if (
      width < SOURCE_IMAGE_RULES.minWidth ||
      height < SOURCE_IMAGE_RULES.minHeight
    ) {
      throw new ImageValidationError(
        "IMAGE_TOO_SMALL",
        "Минимальный размер изображения — 512 × 512 px",
      );
    }
    if (Math.max(width, height) > SOURCE_IMAGE_RULES.maxSide) {
      throw new ImageValidationError(
        "IMAGE_DIMENSIONS_TOO_LARGE",
        "Максимальная сторона изображения — 6000 px",
      );
    }

    const base = sharp(input, { failOn: "error" }).rotate();
    let normalized: Buffer;
    let mimeType: ValidatedSourceImage["mimeType"];
    let extension: ValidatedSourceImage["extension"];
    if (detected.mime === "image/png") {
      normalized = await base.png({ compressionLevel: 8 }).toBuffer();
      mimeType = "image/png";
      extension = "png";
    } else if (detected.mime === "image/webp") {
      normalized = await base.webp({ quality: 95 }).toBuffer();
      mimeType = "image/webp";
      extension = "webp";
    } else {
      normalized = await base.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
      mimeType = "image/jpeg";
      extension = "jpg";
    }

    const preview = await sharp(normalized)
      .resize({
        width: SOURCE_IMAGE_RULES.previewMaxWidth,
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    return {
      normalized,
      preview,
      mimeType,
      extension,
      width,
      height,
      checksum: createHash("sha256").update(normalized).digest("hex"),
      originalName: file.name.slice(0, 255),
    };
  } catch (error) {
    if (error instanceof ImageValidationError) throw error;
    throw new ImageValidationError(
      "IMAGE_CORRUPTED",
      "Изображение повреждено или не декодируется",
    );
  }
}

export async function validateReferenceImage(
  file: File,
): Promise<ValidatedSourceImage> {
  const limits = getSystemLimits();
  if (file.size <= 0)
    throw new ImageValidationError("IMAGE_EMPTY", "Файл пуст");
  if (file.size > limits.maxUploadSizeBytes)
    throw new ImageValidationError(
      "IMAGE_TOO_LARGE",
      `Файл превышает ${limits.maxUploadSizeMb} МБ`,
    );

  const input = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(input);
  if (
    !detected ||
    !REFERENCE_IMAGE_RULES.allowedMimeTypes.includes(detected.mime as never)
  ) {
    throw new ImageValidationError(
      "IMAGE_FORMAT_UNSUPPORTED",
      "Поддерживаются только JPG, PNG и WEBP",
    );
  }
  if (file.type && file.type !== detected.mime)
    throw new ImageValidationError(
      "IMAGE_MIME_MISMATCH",
      "Тип файла не совпадает с его содержимым",
    );

  try {
    const metadata = await sharp(input, { failOn: "error" })
      .rotate()
      .metadata();
    const width = metadata.autoOrient.width ?? metadata.width;
    const height = metadata.autoOrient.height ?? metadata.height;
    if (!width || !height)
      throw new ImageValidationError(
        "IMAGE_DIMENSIONS_UNKNOWN",
        "Не удалось определить размеры изображения",
      );
    if (
      width < REFERENCE_IMAGE_RULES.minWidth ||
      height < REFERENCE_IMAGE_RULES.minHeight
    ) {
      throw new ImageValidationError(
        "IMAGE_TOO_SMALL",
        "Минимальный размер референса — 128 × 128 px",
      );
    }
    if (Math.max(width, height) > REFERENCE_IMAGE_RULES.maxSide) {
      throw new ImageValidationError(
        "IMAGE_DIMENSIONS_TOO_LARGE",
        "Максимальная сторона изображения — 6000 px",
      );
    }

    const normalized = await sharp(input, { failOn: "error" })
      .rotate()
      .toColorspace("srgb")
      .webp({ quality: 92 })
      .toBuffer();

    return {
      normalized,
      preview: normalized,
      mimeType: "image/webp",
      extension: "webp",
      width,
      height,
      checksum: createHash("sha256").update(normalized).digest("hex"),
      originalName: file.name.slice(0, 255),
    };
  } catch (error) {
    if (error instanceof ImageValidationError) throw error;
    throw new ImageValidationError(
      "IMAGE_CORRUPTED",
      "Изображение повреждено или не декодируется",
    );
  }
}
