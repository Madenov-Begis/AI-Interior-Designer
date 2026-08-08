const DEFAULT_DOWNLOAD_NAME = "interior-design.webp";

export function generationDownloadName(contentDisposition?: string) {
  if (!contentDisposition) return DEFAULT_DOWNLOAD_NAME;

  const encodedName = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i,
  )?.[1];
  if (encodedName) {
    try {
      return decodeURIComponent(encodedName);
    } catch {
      return DEFAULT_DOWNLOAD_NAME;
    }
  }

  return (
    contentDisposition.match(/filename="?([^";]+)"?/i)?.[1] ??
    DEFAULT_DOWNLOAD_NAME
  );
}
