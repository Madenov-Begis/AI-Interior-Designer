export function dataUrlToBlob(dataUrl: string) {
  const separatorIndex = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || separatorIndex === -1) {
    throw new TypeError("Некорректный data URL");
  }

  const metadata = dataUrl.slice(5, separatorIndex);
  const payload = dataUrl.slice(separatorIndex + 1);
  const parts = metadata.split(";");
  const mimeType = parts[0] || "application/octet-stream";

  if (!parts.includes("base64")) {
    return new Blob([decodeURIComponent(payload)], { type: mimeType });
  }

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}
