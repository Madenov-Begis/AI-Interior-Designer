import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { LocalizedAppProvider } from "./localized-app-provider";
import { LegalDocumentView } from "@/shared/components/legal-document-view";

export async function MarkdownLegalDocument({
  fileName,
}: {
  fileName: "privacy-policy.md" | "public-offer.md";
}) {
  const source = await readFile(
    path.join(process.cwd(), "docs", "legal", fileName),
    "utf8",
  );
  const html = marked.parse(source, { async: false, gfm: true }) as string;

  return (
    <LocalizedAppProvider>
      <LegalDocumentView html={html} />
    </LocalizedAppProvider>
  );
}
