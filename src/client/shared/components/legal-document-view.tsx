"use client";

import Link from "next/link";
import {
  AppLanguageSwitcher,
  LocalizedSkipLink,
  useAppText,
} from "@/shared/providers";
import { RuvieLogo } from "@/shared/ui";

export function LegalDocumentView({ html }: { html: string }) {
  const t = useAppText();

  return (
    <>
      <LocalizedSkipLink />
      <main
        id="main-content"
        className="min-h-screen bg-background px-5 py-8 sm:px-8 sm:py-12"
      >
        <article className="legal-document mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-6">
            <RuvieLogo href="/" />
            <div className="flex items-center gap-3">
              <AppLanguageSwitcher />
              <Link
                className="text-sm text-muted-foreground hover:text-foreground"
                href="/"
              >
                {t("Вернуться на главную")}
              </Link>
            </div>
          </div>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </main>
    </>
  );
}
