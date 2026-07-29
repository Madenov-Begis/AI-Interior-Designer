import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const examples = [
  { title: "Гостиная", style: "Джапанди", image: "/images/interior-styles/japandi.webp" },
  { title: "Кухня", style: "Современный", image: "/images/interior-styles/modern.webp" },
  { title: "Спальня", style: "Минимализм", image: "/images/interior-styles/minimalism.webp" },
  { title: "Кабинет", style: "Лофт", image: "/images/interior-styles/loft.webp" },
  { title: "Столовая", style: "Неоклассика", image: "/images/interior-styles/neoclassic.webp" },
  { title: "Детская", style: "Скандинавский", image: "/images/interior-styles/scandinavian.webp" },
];

export function ExamplesSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1480px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Примеры
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Комнаты и стили
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Начните со знакомого направления, а затем уточняйте результат
            обычным текстом и референсами.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {examples.map((example) => (
            <Card key={`${example.title}-${example.style}`} className="group overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={example.image}
                  alt={`${example.title} в стиле ${example.style}`}
                  fill
                  sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                />
              </div>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <h3 className="font-semibold">{example.title}</h3>
                  <Badge variant="secondary" className="mt-2">
                    {example.style}
                  </Badge>
                </div>
                <span className="grid size-9 place-items-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
