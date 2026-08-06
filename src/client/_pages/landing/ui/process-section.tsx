import Image from "next/image";
import { ImageUp, MousePointer2, Sparkles } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Загрузите комнату",
    copy: "Обычная фотография со смартфона сразу появляется на рабочем холсте.",
    icon: ImageUp,
  },
  {
    number: "02",
    title: "Выберите результат",
    copy: "Укажите стиль, формат и словами опишите, что должно измениться.",
    icon: MousePointer2,
  },
  {
    number: "03",
    title: "Продолжайте ветку",
    copy: "Выберите готовое изображение, добавьте новую правку или референс.",
    icon: Sparkles,
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="page-grid border-b border-border">
      <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Как это происходит
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            3 шага — и готово
          </h2>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.number}
                className="overflow-hidden rounded-[24px] border border-border bg-card"
              >
                <div className="flex min-h-60 flex-col p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-5xl font-black italic text-primary">
                      {step.number}
                    </span>
                    <span className="grid size-11 place-items-center rounded-full bg-secondary text-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-auto pt-10 text-2xl font-bold tracking-[-0.03em]">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    {step.copy}
                  </p>
                </div>
                <div className="relative aspect-[16/10] overflow-hidden border-t border-border">
                  <Image
                    src={
                      index === 0
                        ? "/images/landing/japandi-before.png"
                        : index === 1
                          ? "/images/interior-styles/minimalism.webp"
                          : "/images/interior-styles/japandi.webp"
                    }
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
