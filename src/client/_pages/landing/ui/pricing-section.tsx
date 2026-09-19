"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  CREDIT_PACKAGES_QUERY_KEY,
  loadCreditPackages,
} from "@/features/manage-credits";
import { GENERATION_CREDIT_COST } from "@/shared/config";
import { buttonClassName, LoadingRegion, Skeleton } from "@/shared/ui";

export function PricingSection() {
  const t = useTranslations("Pricing");
  const format = useFormatter();
  const packagesQuery = useQuery({
    queryKey: CREDIT_PACKAGES_QUERY_KEY,
    queryFn: ({ signal }) => loadCreditPackages(signal),
  });
  const packages = packagesQuery.data?.items ?? [];

  return (
    <section
      id="pricing"
      className="landing-anchor page-grid border-b border-border bg-[#101719] text-white"
    >
      <div className="landing-shell landing-section">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black tracking-[-0.055em] sm:text-5xl">
            {t("heading")}
          </h2>
          <p className="mt-4 text-base font-semibold text-white/70">
            {t("description")}
          </p>
        </div>

        {packagesQuery.isLoading ? (
          <LoadingRegion
            label={t("loading")}
            className="mt-8 grid gap-4 md:grid-cols-3 lg:mt-10"
          >
            {[0, 1, 2].map((key) => (
              <Skeleton
                key={key}
                className="min-h-[clamp(340px,44vh,390px)] rounded-[24px] bg-white/10"
              />
            ))}
          </LoadingRegion>
        ) : null}

        {packagesQuery.isError ? (
          <div className="mx-auto mt-12 flex max-w-xl flex-col items-center rounded-[24px] border border-white/15 bg-white/[0.06] p-8 text-center">
            <p className="font-bold">{t("error")}</p>
            <button
              type="button"
              className={buttonClassName(
                "outline",
                "mt-4 h-11 rounded-xl border-white text-white",
                "sm",
              )}
              onClick={() => void packagesQuery.refetch()}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {t("retry")}
            </button>
          </div>
        ) : null}

        {packages.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:mt-10 lg:grid-cols-3">
            {packages.map((pack) => (
              <article
                key={pack.code}
                className={`relative flex min-h-[clamp(340px,44vh,390px)] flex-col rounded-[24px] border bg-[#f2f3f1] p-6 text-[#1b1d1f] shadow-[0_24px_60px_rgba(0,0,0,0.22)] ${
                  pack.popular
                    ? "border-primary ring-2 ring-primary"
                    : "border-white/10"
                }`}
              >
                {pack.popular ? (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-primary-foreground shadow-lg">
                    {t("popular")}
                  </div>
                ) : null}
                <div>
                  <h3 className="text-2xl font-black italic">
                    {t("packageTitle", { credits: pack.credits })}
                  </h3>
                  <p className="mt-1 min-h-5 text-sm text-black/55">
                    {t("packageDescription")}
                  </p>
                </div>
                <div className="mt-5">
                  <p className="text-3xl font-black tracking-[-0.04em] tabular-nums">
                    {format.number(pack.priceUzs, {
                      style: "currency",
                      currency: "UZS",
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="mt-3 text-lg font-black">
                    {pack.credits} {t("credits")}
                  </p>
                </div>
                <div className="my-5 h-px bg-black/8" />
                <div>
                  <p className="text-xs font-bold text-black/55">
                    {t("enoughFor")}
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-5 fill-[#16bf89] text-white" />
                    {Math.floor(pack.credits / GENERATION_CREDIT_COST)}{" "}
                    {t("generations")}
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-black/60">
                    <CheckCircle2 className="size-5 fill-[#16bf89] text-white" />
                    {t("neverExpire")}
                  </p>
                </div>
                <Link
                  href="/app/credits"
                  className={buttonClassName(
                    pack.popular ? "default" : "secondary",
                    pack.popular
                      ? "mt-auto h-11 w-full rounded-xl px-5"
                      : "mt-auto h-11 w-full rounded-xl bg-[#2b2c2f] px-5 text-white hover:bg-[#1d1e20] hover:text-white",
                    "sm",
                  )}
                >
                  {t("buy")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-5 rounded-[24px] border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h3 className="font-bold">{t("starterTitle")}</h3>
            <p className="mt-1 text-sm text-white/55">{t("starterCopy")}</p>
          </div>
          <Link
            href="/app"
            className={buttonClassName(
              "outline",
              "h-11 shrink-0 rounded-xl border-white bg-white px-6 text-[#1b1d1f] hover:bg-white/90 hover:text-[#1b1d1f]",
              "sm",
            )}
          >
            {t("freeCta")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
