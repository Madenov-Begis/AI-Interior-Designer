import Image from "next/image";
import { LandingAuthLink } from "./landing-auth-gate";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Home,
  Layers3,
  MessageSquareText,
  MousePointer2,
  Palette,
  Upload,
} from "lucide-react";
import { buttonClassName, RuvieWordmark } from "@/shared/ui";
import type { LandingDictionary } from "../model/dictionary";
import { marketingCtaClassName } from "./cta-style";

const workflowIcons = [
  Upload,
  MousePointer2,
  MessageSquareText,
  Layers3,
] as const;
const storyIcons = [Home, BriefcaseBusiness, Building2, Palette] as const;

export function WorkflowSection({
  dictionary,
}: {
  dictionary: LandingDictionary["workflow"];
}) {
  return (
    <section className="border-b border-border bg-[#1a1c1f]">
      <div className="landing-shell landing-section gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {dictionary.eyebrow}
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            {dictionary.heading}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            {dictionary.description}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {dictionary.items.map((text, index) => {
              const Icon = workflowIcons[index] ?? Upload;
              return (
                <div
                  key={text}
                  className="flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold">{text}</span>
                </div>
              );
            })}
          </div>
          <LandingAuthLink
            href="/app"
            className={buttonClassName(
              "default",
              marketingCtaClassName("mt-7 rounded-2xl px-7"),
              "lg",
            )}
          >
            {dictionary.cta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </LandingAuthLink>
        </div>
        <div className="rounded-[26px] border border-border bg-card p-3 shadow-2xl shadow-black/35">
          <div className="page-grid relative aspect-[16/10] overflow-hidden rounded-[18px] border border-border bg-background">
            <div className="absolute inset-x-6 top-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <RuvieWordmark />
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                {dictionary.credits}
              </span>
            </div>
            <div className="absolute left-[12%] top-[28%] w-[34%] overflow-hidden rounded-xl border border-primary bg-card">
              <Image
                src="/images/landing/japandi-before.png"
                alt={dictionary.sourceAlt}
                width={520}
                height={390}
                className="aspect-[4/3] w-full object-cover"
              />
              <p className="p-3 text-xs font-semibold">
                {dictionary.sourceLabel}
              </p>
            </div>
            <div className="absolute right-[9%] top-[22%] w-[38%] overflow-hidden rounded-xl border border-border bg-card">
              <Image
                src="/images/interior-styles/japandi.webp"
                alt={dictionary.resultAlt}
                width={560}
                height={420}
                className="aspect-[4/3] w-full object-cover"
              />
              <p className="p-3 text-xs font-semibold">
                {dictionary.resultLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoriesSection({
  dictionary,
}: {
  dictionary: LandingDictionary["stories"];
}) {
  return (
    <section className="border-b border-border">
      <div className="landing-shell landing-section">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {dictionary.eyebrow}
        </p>
        <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
          {dictionary.heading}
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dictionary.items.map(({ title, text }, index) => {
            const Icon = storyIcons[index] ?? Home;
            return (
              <article
                key={title}
                className="flex min-h-64 flex-col rounded-[24px] border border-border bg-card p-6"
              >
                <Icon className="size-7 text-primary" aria-hidden="true" />
                <div className="mt-auto pt-12">
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {text}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FaqSection({
  dictionary,
}: {
  dictionary: LandingDictionary["faq"];
}) {
  return (
    <section className="border-b border-border bg-[#151719]">
      <div className="landing-shell landing-section gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {dictionary.eyebrow}
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            {dictionary.heading}
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            {dictionary.description}
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {dictionary.items.map(({ question, answer }) => (
            <details key={question} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-semibold">
                {question}
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-primary group-open:rotate-45">
                  <span className="text-xl leading-none">+</span>
                </span>
              </summary>
              <p className="max-w-2xl pb-5 pr-12 text-sm leading-6 text-muted-foreground">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection({
  dictionary,
}: {
  dictionary: LandingDictionary["finalCta"];
}) {
  return (
    <section className="border-b border-border bg-[#111315]">
      <div className="landing-shell landing-section">
        <div className="relative min-h-[clamp(560px,72vh,760px)] overflow-hidden rounded-[34px]">
          <Image
            src="/images/interior-styles/neoclassic.webp"
            alt={dictionary.imageAlt}
            fill
            sizes="(min-width: 1440px) 1344px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/10" />
          <div className="relative flex min-h-[clamp(560px,72vh,760px)] max-w-2xl flex-col justify-end p-7 sm:p-12 lg:p-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {dictionary.eyebrow}
            </p>
            <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.06em] sm:text-6xl">
              {dictionary.heading}
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/65">
              {dictionary.description}
            </p>
            <div className="mt-8">
              <LandingAuthLink
                href="/app"
                className={buttonClassName(
                  "default",
                  marketingCtaClassName("rounded-full px-7 shadow-none"),
                  "lg",
                )}
              >
                {dictionary.cta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </LandingAuthLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
