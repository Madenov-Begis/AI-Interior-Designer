import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

const examples = [
  {
    title: "Гостиная",
    style: "Джапанди",
    image: "/images/interior-styles/japandi.webp",
  },
  {
    title: "Кухня",
    style: "Современный",
    image: "/images/interior-styles/modern.webp",
  },
  {
    title: "Спальня",
    style: "Минимализм",
    image: "/images/interior-styles/minimalism.webp",
  },
  {
    title: "Кабинет",
    style: "Лофт",
    image: "/images/interior-styles/loft.webp",
  },
  {
    title: "Столовая",
    style: "Неоклассика",
    image: "/images/interior-styles/neoclassic.webp",
  },
  {
    title: "Детская",
    style: "Скандинавский",
    image: "/images/interior-styles/scandinavian.webp",
  },
];

export function ExamplesSection() {
  return (
    <section id="examples" className="border-b border-border bg-card/35">
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Примеры
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              Подходит для разных комнат
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Покажите Renoa помещение — и получите чистую, реалистичную
            визуализацию в нужном направлении.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {examples.map((example) => (
            <article
              key={`${example.title}-${example.style}`}
              className="group overflow-hidden rounded-[22px] border border-border bg-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={example.image}
                  alt={`${example.title} в стиле ${example.style}`}
                  fill
                  sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <h3 className="font-semibold">{example.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {example.style}
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
