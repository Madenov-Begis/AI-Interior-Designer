"use client";

import { apiClient } from "@/shared/api";
import { generationDownloadName } from "../model/generation-download";

export async function downloadWorkspaceGeneration(generationId: string) {
  const response = await apiClient.get<Blob>(
    `/generations/${generationId}/download`,
    { responseType: "blob" },
  );
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = generationDownloadName(
    response.headers["content-disposition"],
  );
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
