import Image from "next/image";
import type { LandingDictionary } from "../model/dictionary";

const exampleAssets = [
  {
    image: "/images/interior-styles/japandi.webp",
    className:
      "min-h-[440px] sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:min-h-0",
  },
  {
    image: "/images/interior-styles/modern.webp",
    className: "min-h-[304px] lg:min-h-0",
  },
  {
    image: "/images/interior-styles/minimalism.webp",
    className: "min-h-[304px] lg:min-h-0",
  },
  {
    image: "/images/interior-styles/loft.webp",
    className: "min-h-[304px] lg:min-h-0",
  },
  {
    image: "/images/interior-styles/neoclassic.webp",
    className: "min-h-[304px] lg:min-h-0",
  },
];

export function ExamplesSection({
  dictionary,
}: {
  dictionary: LandingDictionary["examples"];
}) {
  return (
    <section
      id="examples"
      className="landing-anchor border-b border-border bg-[#111315]"
    >
      <div className="landing-shell landing-section">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.65fr] lg:items-end">
          <h2 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.06em] sm:text-6xl">
            {dictionary.heading[0]}
            <br />
            {dictionary.heading[1]}
          </h2>
          <p className="max-w-lg text-base leading-7 text-muted-foreground">
            {dictionary.description}
          </p>
        </div>

        <div className="mt-8 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:h-[clamp(400px,52vh,620px)] lg:grid-cols-4 lg:grid-rows-2">
          {exampleAssets.map((asset, index) => {
            const example = dictionary.items[index];
            if (!example) return null;
            return (
              <article
                key={`${example.title}-${example.style}`}
                className={`group relative overflow-hidden rounded-[24px] bg-card ${asset.className}`}
              >
                <Image
                  src={asset.image}
                  alt={example.alt}
                  fill
                  sizes="(min-width: 1280px) 50vw, (min-width: 640px) 50vw, 100vw"
                  className="landing-motion object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                  <div>
                    <h3 className="text-lg font-bold">{example.title}</h3>
                    <p className="mt-1 text-sm text-white/65">
                      {example.style}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white/75 backdrop-blur-md">
                    {dictionary.aiLabel}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
