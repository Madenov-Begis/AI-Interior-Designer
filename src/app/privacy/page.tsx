import type { Metadata } from "next";
import { MarkdownLegalDocument } from "@/server/shared/legal/markdown-document";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — Ruvie",
};

export default function PrivacyPage() {
  return <MarkdownLegalDocument fileName="privacy-policy.md" />;
}
