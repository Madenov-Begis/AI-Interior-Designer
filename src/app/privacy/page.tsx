import type { Metadata } from "next";
import { MarkdownLegalDocument } from "../_components/markdown-legal-document";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — Ruvie",
};

export default function PrivacyPage() {
  return <MarkdownLegalDocument fileName="privacy-policy.md" />;
}
