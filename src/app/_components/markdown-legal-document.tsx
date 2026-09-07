import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import Link from "next/link";
import { RuvieLogo } from "@/shared/ui";

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
    <main
      id="main-content"
      className="min-h-screen bg-background px-5 py-8 sm:px-8 sm:py-12"
    >
      <article className="legal-document mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-6">
          <RuvieLogo href="/" />
          <Link
            className="text-sm text-muted-foreground hover:text-foreground"
            href="/"
          >
            На главную
          </Link>
        </div>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </main>
  );
}
