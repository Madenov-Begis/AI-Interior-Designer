import type { Metadata } from "next";
import { MarkdownLegalDocument } from "../_components/markdown-legal-document";

export const metadata: Metadata = {
  title: "Публичная оферта — Ruvie",
};

export default function OfferPage() {
  return <MarkdownLegalDocument fileName="public-offer.md" />;
}
