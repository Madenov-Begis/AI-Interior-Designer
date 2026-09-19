import Image from "next/image";
import { GitBranch, ImageUp, MessageSquareText } from "lucide-react";
import type { LandingDictionary } from "../model/dictionary";

const stepIcons = [ImageUp, MessageSquareText, GitBranch] as const;

export function ProcessSection({
  dictionary,
}: {
  dictionary: LandingDictionary["process"];
}) {
  return (
    <section
      id="process"
      className="landing-anchor border-b border-black/10 bg-[#f1eee6] text-[#18191b]"
    >
      <div className="landing-shell landing-section gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5d702f]">
            {dictionary.eyebrow}
          </p>
          <h2 className="mt-4 max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.06em] sm:text-5xl 2xl:text-6xl">
            {dictionary.heading}
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-black/55">
            {dictionary.description}
          </p>
          <div className="relative mt-7 overflow-hidden rounded-[28px] bg-[#d9d5cb] p-2 shadow-[0_24px_70px_rgba(33,31,26,0.14)]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] lg:h-[clamp(220px,31vh,360px)] lg:aspect-auto">
              <Image
                src="/images/interior-styles/modern.webp"
                alt={dictionary.imageAlt}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <ol className="divide-y divide-black/10 border-y border-black/10">
          {dictionary.steps.map(({ title, copy }, index) => {
            const Icon = stepIcons[index] ?? ImageUp;
            const number = String(index + 1).padStart(2, "0");
            return (
              <li
                key={number}
                className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-center lg:py-7"
              >
                <span className="grid size-12 place-items-center rounded-full bg-[#1c1d1f] font-mono text-sm font-bold text-white">
                  {number}
                </span>
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.025em] sm:text-2xl">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-black/55">
                    {copy}
                  </p>
                </div>
                <span className="col-start-2 grid size-11 place-items-center rounded-2xl bg-[#dfeabf] text-[#4c6320] sm:col-start-auto">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
