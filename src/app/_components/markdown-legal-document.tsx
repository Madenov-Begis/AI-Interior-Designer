import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { cookies } from "next/headers";
import { LocalizedAppProvider } from "./localized-app-provider";
import { LegalDocumentView } from "@/shared/components/legal-document-view";
import { APP_LOCALE_COOKIE, resolveAppLocale } from "@/i18n/app-locale";

export async function MarkdownLegalDocument({
  document,
}: {
  document: "privacy-policy" | "public-offer";
}) {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  const fileName =
    locale === "ru" ? `${document}.md` : `${document}.${locale}.md`;
  const source = await readFile(
    path.join(process.cwd(), "docs", "legal", fileName),
    "utf8",
  );
  const html = marked.parse(source, { async: false, gfm: true }) as string;

  return (
    <LocalizedAppProvider>
      <LegalDocumentView html={html} translated={locale !== "ru"} />
    </LocalizedAppProvider>
  );
}
