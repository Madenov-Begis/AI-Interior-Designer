"use client";

import { apiData } from "@/shared/api";

export async function downloadWorkspaceGeneration(generationId: string) {
  const result = await apiData<{ url: string; filename: string }>({
    url: `/generations/${generationId}/download`,
    method: "GET",
    params: { signed: "1" },
  });
  const link = document.createElement("a");
  link.href = result.url;
  link.download = result.filename;
  link.rel = "noreferrer";
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
}
