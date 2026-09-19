import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getLandingDictionary } from "@/client/_pages/landing/model/dictionaries";
import { routing } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const dictionary = await getLandingDictionary(locale);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "68px 76px",
        color: "#f7f7f5",
        background:
          "radial-gradient(circle at 82% 20%, rgba(116,143,255,.34), transparent 34%), radial-gradient(circle at 20% 85%, rgba(169,237,50,.28), transparent 36%), #151719",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>
        Ruvie
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
        <div
          style={{
            display: "flex",
            fontSize: 66,
            lineHeight: 1.02,
            letterSpacing: "-3px",
            fontWeight: 900,
          }}
        >
          {dictionary.seo.openGraphTitle}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            maxWidth: 850,
            color: "rgba(255,255,255,.68)",
            fontSize: 27,
            lineHeight: 1.35,
          }}
        >
          {dictionary.seo.openGraphDescription}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          color: "#a9ed32",
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        ruvie.cc
      </div>
    </div>,
    size,
  );
}
