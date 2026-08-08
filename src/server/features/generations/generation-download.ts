const DOWNLOAD_EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export function generationDownloadFilename(createdAt: Date, mimeType: string) {
  const extension = DOWNLOAD_EXTENSIONS[mimeType] ?? "bin";
  return `interior-design-${createdAt.toISOString().slice(0, 10)}.${extension}`;
}
