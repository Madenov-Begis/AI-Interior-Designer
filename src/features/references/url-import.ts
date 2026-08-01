import "server-only";

import { addReferenceFiles } from "@/features/references/service";
import { safeDownload, SafeFetchError } from "@/features/references/safe-fetch";

function readAttributes(tag: string) {
  const attributes = new Map<string, string>();
  for (const match of tag.matchAll(
    /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
  )) {
    attributes.set(
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? match[4] ?? "",
    );
  }
  return attributes;
}

function findJsonLdImage(value: unknown): string | null {
  if (typeof value === "string") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJsonLdImage(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const image = record.image;
  if (typeof image === "string") return image;
  if (Array.isArray(image) && typeof image[0] === "string") return image[0];
  if (
    image &&
    typeof image === "object" &&
    typeof (image as Record<string, unknown>).url === "string"
  )
    return (image as Record<string, string>).url;
  for (const child of Object.values(record)) {
    const found = findJsonLdImage(child);
    if (found) return found;
  }
  return null;
}

function findImageInHtml(html: string, pageUrl: string) {
  const candidates = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = readAttributes(match[0]);
    const key = (
      attributes.get("property") ||
      attributes.get("name") ||
      ""
    ).toLowerCase();
    const content = attributes.get("content");
    if (
      content &&
      [
        "og:image",
        "og:image:url",
        "twitter:image",
        "twitter:image:src",
      ].includes(key) &&
      !candidates.has(key)
    )
      candidates.set(key, content);
  }
  for (const key of [
    "og:image",
    "og:image:url",
    "twitter:image",
    "twitter:image:src",
  ]) {
    const value = candidates.get(key);
    if (value) return new URL(value, pageUrl).toString();
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = readAttributes(match[0]);
    if (
      (attributes.get("rel") || "").toLowerCase() === "image_src" &&
      attributes.get("href")
    ) {
      return new URL(attributes.get("href")!, pageUrl).toString();
    }
  }

  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const image = findJsonLdImage(JSON.parse(match[1]));
      if (image) return new URL(image, pageUrl).toString();
    } catch {
      // Ignore malformed third-party JSON-LD and continue scanning.
    }
  }

  const images: Array<{ url: string; score: number }> = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attributes = readAttributes(match[0]);
    const source =
      attributes.get("src") ||
      attributes.get("data-src") ||
      attributes.get("data-original");
    if (
      !source ||
      source.startsWith("data:") ||
      /(?:icon|logo|avatar|sprite)/i.test(source)
    )
      continue;
    const width = Number(attributes.get("width") ?? 0);
    const height = Number(attributes.get("height") ?? 0);
    images.push({
      url: new URL(source, pageUrl).toString(),
      score: Number.isFinite(width * height) ? width * height : 0,
    });
  }
  images.sort((a, b) => b.score - a.score);
  if (images[0]) return images[0].url;
  throw new SafeFetchError(
    "IMAGE_NOT_FOUND",
    "На странице не найдено подходящее изображение",
  );
}

function fileNameFromUrl(value: string) {
  const pathname = new URL(value).pathname;
  const name = decodeURIComponent(
    pathname.split("/").pop() || "reference",
  ).slice(0, 200);
  return name.includes(".") ? name : `${name}.image`;
}

export type UrlImportResult =
  | { url: string; success: true; referenceId: string; fileId: string }
  | { url: string; success: false; code: string; message: string };

export async function importReferenceUrls(
  userId: string,
  projectId: string,
  urls: string[],
): Promise<UrlImportResult[]> {
  const results: UrlImportResult[] = [];
  for (const originalUrl of urls) {
    try {
      let downloaded = await safeDownload(originalUrl);
      if (downloaded.isHtml) {
        const imageUrl = findImageInHtml(
          downloaded.body.toString("utf8"),
          downloaded.finalUrl,
        );
        downloaded = await safeDownload(imageUrl);
        if (downloaded.isHtml)
          throw new SafeFetchError(
            "IMAGE_NOT_FOUND",
            "Ссылка на изображение снова вернула HTML",
          );
      }
      const file = new File(
        [downloaded.body],
        fileNameFromUrl(downloaded.finalUrl),
        { type: downloaded.contentType },
      );
      const [reference] = await addReferenceFiles(
        userId,
        projectId,
        [file],
        [originalUrl],
      );
      results.push({
        url: originalUrl,
        success: true,
        referenceId: reference.id,
        fileId: reference.fileId,
      });
    } catch (error) {
      const code =
        error instanceof SafeFetchError
          ? error.code
          : error instanceof Error &&
              "code" in error &&
              typeof error.code === "string"
            ? error.code
            : "URL_IMPORT_FAILED";
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось импортировать ссылку";
      results.push({ url: originalUrl, success: false, code, message });
    }
  }
  return results;
}
