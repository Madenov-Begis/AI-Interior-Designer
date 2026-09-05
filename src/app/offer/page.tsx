import type { Metadata } from "next";
import { MarkdownLegalDocument } from "@/server/shared/legal/markdown-document";

export const metadata: Metadata = {
  title: "Публичная оферта — Ruvie",
};

export default function OfferPage() {
  return <MarkdownLegalDocument fileName="public-offer.md" />;
}
