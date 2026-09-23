import Image from "next/image";
import { LandingAuthLink } from "./landing-auth-gate";
import {
  ArrowRight,
  CircleCheck,
  ImagePlus,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { buttonClassName } from "@/shared/ui";
import type { LandingDictionary } from "../model/dictionary";

export function Hero({
  dictionary,
}: {
  dictionary: LandingDictionary["hero"];
}) {
  return (
    <section className="relative -mt-[var(--ruvie-header-height)] overflow-hidden border-b border-border bg-[#151719]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 18% 18%, rgba(169, 237, 50, 0.12), transparent 28%), radial-gradient(circle at 82% 46%, rgba(116, 143, 255, 0.11), transparent 32%)",
        }}
      />
      <div className="landing-shell landing-hero relative gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/70">
            <span className="size-2 rounded-full bg-primary shadow-[0_0_18px_rgba(169,237,50,0.7)]" />
            {dictionary.eyebrow}
          </div>
          <h1 className="mt-5 text-[clamp(3rem,5vw,5.5rem)] font-black leading-[0.9] tracking-[-0.07em]">
            {dictionary.title[0]}
            <br />
            {dictionary.title[1]}
            <br />
            <span className="text-primary">{dictionary.title[2]}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
            {dictionary.description}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <LandingAuthLink
              href="/app"
              className={buttonClassName(
                "default",
                "h-13 rounded-full border border-primary/70 px-6 shadow-[0_12px_34px_rgba(169,237,50,0.16)]",
                "lg",
              )}
            >
              <ImagePlus className="size-5" aria-hidden="true" />
              {dictionary.primaryCta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </LandingAuthLink>
            <a
              href="#examples"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white/70 transition-colors hover:text-white"
            >
              {dictionary.examplesCta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-white/50 sm:text-sm">
            <ShieldCheck
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {dictionary.freeCredits}
          </p>
          <div className="mt-5 grid gap-3 text-sm text-white/65 sm:grid-cols-3">
            {dictionary.highlights.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CircleCheck
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[500px] lg:min-h-[clamp(420px,61vh,560px)]">
          <div className="absolute inset-x-0 top-3 overflow-hidden rounded-[34px] border border-white/10 bg-[#232528] p-2 shadow-[0_40px_120px_rgba(0,0,0,0.48)] sm:left-[8%]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[27px]">
              <Image
                src="/images/interior-styles/japandi.webp"
                alt={dictionary.resultAlt}
                fill
                preload
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-2 text-xs font-semibold backdrop-blur-md">
                <span className="size-2 rounded-full bg-primary" />
                {dictionary.resultLabel}
              </div>
            </div>
          </div>

          <div className="absolute bottom-2 left-0 w-[46%] overflow-hidden rounded-[24px] border border-white/15 bg-[#25272a] p-2 shadow-[0_28px_70px_rgba(0,0,0,0.5)] sm:left-[2%]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[18px]">
              <Image
                src="/images/landing/japandi-before.png"
                alt={dictionary.sourceAlt}
                fill
                sizes="(min-width: 1024px) 24vw, 46vw"
                className="object-cover"
              />
            </div>
            <p className="px-2 pb-1 pt-3 text-xs font-semibold text-white/70">
              {dictionary.sourceLabel}
            </p>
          </div>

          <div className="absolute bottom-[8%] right-0 max-w-56 rounded-[20px] border border-white/10 bg-[#f0eee7] p-4 text-[#171719] shadow-2xl sm:right-[2%]">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Layers3 className="size-4 text-[#5d7c20]" aria-hidden="true" />
              {dictionary.geometryTitle}
            </div>
            <p className="mt-1.5 text-xs leading-5 text-black/55">
              {dictionary.geometryCopy}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
