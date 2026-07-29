import {
  ArrowRight,
  Check,
  Coins,
  ImageUp,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import {
  GENERATION_CREDIT_COST,
  GENERATION_REFUND_MESSAGE,
} from "@/config/product";
import { authEntry } from "@/lib/auth/route-policy";

const styles = ["Джапанди", "Минимализм", "Современный"];

export function Hero({ authenticated }: { authenticated: boolean }) {
  const entry = authEntry(authenticated);

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1480px] px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="outline" className="border-primary/30 bg-primary/7 text-primary">
            Интерьер из фотографии
          </Badge>
          <h1 className="mt-6 text-[clamp(3rem,7vw,6.7rem)] font-semibold leading-[0.94] tracking-[-0.07em]">
            Увидьте комнату,
            <span className="block text-primary">в которой хочется жить</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Загрузите фото, выберите стиль и получите реалистичный интерьер
            прямо на холсте. Без выбора модели и сложных настроек.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={entry.href}
              className={buttonClassName("default", "w-full sm:w-auto", "lg")}
            >
              {authenticated ? (
                <Sparkles className="size-5" />
              ) : (
                <ImageUp className="size-5" />
              )}
              {authenticated ? "Продолжить проект" : "Загрузить комнату"}
              <ArrowRight className="size-4" />
            </Link>
            {!authenticated ? (
              <Link
                href="/login"
                className={buttonClassName("outline", "w-full sm:w-auto", "lg")}
              >
                Продолжить с Google
              </Link>
            ) : null}
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 font-mono text-[10px] leading-5 text-muted-foreground sm:text-xs">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            {GENERATION_CREDIT_COST} кредита за генерацию · при технической
            ошибке кредиты возвращаются
          </p>
        </div>

        <div
          id="examples"
          className="mt-14 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/35 sm:mt-18"
          aria-label="Демонстрация преобразования комнаты"
        >
          <div className="grid lg:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)]">
            <figure className="relative aspect-[4/3] overflow-hidden lg:aspect-auto lg:min-h-[520px]">
              <Image
                src="/images/landing/japandi-before.png"
                alt="Пустая комната до преобразования"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
              <figcaption className="absolute bottom-4 left-4 rounded-lg bg-black/75 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white backdrop-blur">
                До
              </figcaption>
            </figure>

            <div className="flex flex-col justify-center border-y border-border bg-background p-5 lg:border-x lg:border-y-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Выберите стиль
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">
                Один понятный выбор
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Renoa сохраняет геометрию и меняет только интерьер.
              </p>
              <div className="mt-5 grid gap-2">
                {styles.map((style, index) => (
                  <div
                    key={style}
                    className={`flex h-11 items-center gap-3 rounded-lg border px-3 text-sm ${
                      index === 0
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/55 text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`grid size-5 place-items-center rounded-full border ${
                        index === 0
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {index === 0 ? <Check className="size-3" /> : null}
                    </span>
                    {style}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/7 p-3 text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Coins className="size-4 text-primary" />
                  Стоимость
                </span>
                <span className="font-mono font-semibold text-primary">
                  {GENERATION_CREDIT_COST} кредита
                </span>
              </div>
            </div>

            <figure className="relative aspect-[4/3] overflow-hidden lg:aspect-auto lg:min-h-[520px]">
              <Image
                src="/images/interior-styles/japandi.webp"
                alt="Гостиная в стиле джапанди после преобразования"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
              <figcaption className="absolute bottom-4 left-4 rounded-lg bg-black/75 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white backdrop-blur">
                После · Джапанди
              </figcaption>
            </figure>
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-5 text-muted-foreground">
          {GENERATION_REFUND_MESSAGE}
        </p>
      </div>
    </section>
  );
}
