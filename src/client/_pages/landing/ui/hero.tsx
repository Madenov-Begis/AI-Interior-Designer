import { ArrowRight, ImagePlus, Sparkle } from "lucide-react";
import Link from "next/link";
import { buttonClassName } from "@/shared/ui";
import { marketingCtaClassName } from "./cta-style";

const ticker = [
  "AI-РЕДИЗАЙН",
  "БЕЗ СЛОЖНЫХ НАСТРОЕК",
  "БЕЗ ДИЗАЙНЕРА",
  "ПРЯМО НА ХОЛСТЕ",
  "ФОТОРЕАЛИСТИЧНО",
];

export function Hero() {
  return (
    <section className="page-grid border-b border-border">
      <div className="mx-auto max-w-[1440px] px-5 pb-4 pt-14 text-center sm:px-8 sm:pb-4 sm:pt-20 lg:pt-14">
        <div className="mx-auto max-w-5xl">
          <h1 className="mx-auto text-[clamp(3rem,5vw,5rem)] font-black italic leading-[0.94] tracking-[-0.075em]">
            <span className="block">Создайте интерьер,</span>
            <span className="block">который хочется</span>
            <span className="block text-primary">сохранить</span>
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            Renoa — сервис создания профессиональных визуализаций интерьера
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/app"
              className={buttonClassName(
                "default",
                marketingCtaClassName(
                  "h-14 w-full rounded-2xl px-8 text-base sm:w-auto",
                ),
                "lg",
              )}
            >
              <ImagePlus className="size-5" aria-hidden="true" />
              Создать интерьер бесплатно
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            10 приветственных кредитов · без привязки карты
          </p>
        </div>
      </div>
      <div className="overflow-hidden border-t border-border py-5">
        <div className="flex min-w-max items-center justify-center gap-7 px-4">
          {[...ticker, ...ticker].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex items-center gap-7 text-lg font-black italic tracking-[-0.03em] text-foreground"
            >
              {item}
              <Sparkle
                className="size-4 fill-primary text-primary"
                aria-hidden="true"
              />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
