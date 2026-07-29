import { ImageUp, MousePointer2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    <section id="process" className="border-b border-border">
      <div className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Как это работает
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              От фотографии до нового интерьера
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Весь процесс находится на одном холсте. Renoa не заставляет
              выбирать модель или разбираться в технических параметрах.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.number} className="min-h-64">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
                        <Icon className="size-[18px]" aria-hidden="true" />
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="mt-auto pt-12 text-lg font-semibold">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.copy}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
