import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  Layers3,
  MessageSquareText,
  MousePointer2,
  Sparkle,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { CREDIT_PACKAGES } from "@/config/product";
import { authEntry } from "@/lib/auth/route-policy";

const modes = [
  {
    title: "Сохранить геометрию",
    copy: "Renoa оставляет стены, окна и ракурс на месте, меняя только интерьер.",
    image: "/images/interior-styles/japandi.webp",
  },
  {
    title: "Попробовать другой стиль",
    copy: "Переключайтесь между направлениями и развивайте понравившийся вариант.",
    image: "/images/interior-styles/loft.webp",
  },
  {
    title: "Уточнить словами",
    copy: "Напишите, что заменить или добавить, прямо рядом с результатом.",
    image: "/images/interior-styles/scandinavian.webp",
  },
];

export function InteriorModesSection({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const entry = authEntry(authenticated);
  return (
    <section id="modes" className="border-b border-border bg-[#111113]">
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.7fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Возможности
            </p>
            <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              Создавайте варианты из одной фотографии
            </h2>
          </div>
          <p className="text-base leading-7 text-muted-foreground">
            Выберите направление, добавьте пожелания и сравнивайте результаты,
            не покидая рабочий холст.
          </p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {modes.map((mode) => (
            <article
              key={mode.title}
              className="overflow-hidden rounded-[24px] border border-border bg-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={mode.image}
                  alt={mode.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold">{mode.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {mode.copy}
                </p>
              </div>
            </article>
          ))}
        </div>
        <Link
          href={entry.href}
          className={buttonClassName("default", "mt-8 rounded-xl px-6", "lg")}
        >
          Создать свой интерьер
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export function WorkflowSection({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const entry = authEntry(authenticated);
  const items = [
    { icon: Upload, text: "Фото сразу появляется на холсте" },
    { icon: MousePointer2, text: "Все варианты остаются рядом" },
    { icon: MessageSquareText, text: "Правки пишутся обычным текстом" },
    { icon: Layers3, text: "История изменений всегда перед глазами" },
  ];

  return (
    <section className="page-grid border-b border-border">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Один рабочий экран
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            Весь проект живёт на холсте
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Никаких мастеров настройки и переходов между экранами. Загрузите
            фото, выберите стиль и продолжайте улучшать результат в одном месте.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {items.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold">{text}</span>
              </div>
            ))}
          </div>
          <Link
            href={entry.href}
            className={buttonClassName("default", "mt-7 rounded-xl", "lg")}
          >
            Открыть холст
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="rounded-[26px] border border-border bg-card p-3 shadow-2xl shadow-black/35">
          <div className="page-grid relative aspect-[16/10] overflow-hidden rounded-[18px] border border-border bg-background">
            <div className="absolute inset-x-6 top-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <span className="font-bold italic">Renoa</span>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                10 кредитов
              </span>
            </div>
            <div className="absolute left-[12%] top-[28%] w-[34%] overflow-hidden rounded-xl border border-primary bg-card">
              <Image
                src="/images/landing/japandi-before.png"
                alt="Исходная комната на холсте"
                width={520}
                height={390}
                className="aspect-[4/3] w-full object-cover"
              />
              <p className="p-3 text-xs font-semibold">Исходное фото</p>
            </div>
            <div className="absolute right-[9%] top-[22%] w-[38%] overflow-hidden rounded-xl border border-border bg-card">
              <Image
                src="/images/interior-styles/japandi.webp"
                alt="Результат генерации на холсте"
                width={560}
                height={420}
                className="aspect-[4/3] w-full object-cover"
              />
              <p className="flex items-center gap-2 p-3 text-xs font-semibold">
                <Sparkle className="size-3.5 fill-primary text-primary" />
                Вариант 01
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ComparisonSection({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const entry = authEntry(authenticated);
  const traditional = [
    "Поиск дизайнера и согласование",
    "Несколько дней на первый вариант",
    "Каждая правка — новая итерация",
  ];
  const renoa = [
    "Загрузка фото и выбор стиля",
    "Первый результат за несколько минут",
    "Новые варианты прямо на холсте",
  ];

  return (
    <section className="page-grid border-b border-border">
      <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            Профессиональный визуал за пару минут
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Быстрее традиционного процесса и понятнее сложных 3D‑редакторов.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <article className="rounded-[24px] border border-border bg-card p-7">
            <p className="text-sm font-semibold text-muted-foreground">
              Традиционный путь
            </p>
            <p className="mt-2 text-4xl font-black italic">3–7 дней</p>
            <ul className="mt-8 grid gap-4">
              {traditional.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary">
                    <X className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-[24px] border border-primary/45 bg-primary p-7 text-primary-foreground">
            <p className="text-sm font-semibold">Renoa</p>
            <p className="mt-2 text-4xl font-black italic">~5 минут</p>
            <ul className="mt-8 grid gap-4">
              {renoa.map((item) => (
                <li key={item} className="flex gap-3 text-sm font-medium">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-foreground text-primary">
                    <Check className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
        <div className="mt-7 text-center">
          <Link
            href={entry.href}
            className={buttonClassName("default", "rounded-xl px-6", "lg")}
          >
            Попробовать сейчас
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PricingSection({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const entry = authEntry(authenticated);

  return (
    <section id="pricing" className="border-b border-border bg-[#111113]">
      <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Тарифы
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            Кредиты на любой объём
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            4 кредита за одну генерацию. При технической ошибке они
            автоматически возвращаются.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {CREDIT_PACKAGES.map((pack) => (
            <article
              key={pack.code}
              className={`relative rounded-[24px] border p-6 ${
                pack.popular
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-[#ededeb] text-[#19191b]"
              }`}
            >
              {pack.popular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-success px-3 py-1 text-xs font-bold text-[#102217]">
                  Выбирают чаще
                </span>
              ) : null}
              <h3 className="text-3xl font-black italic">{pack.name}</h3>
              <p className="mt-7 text-4xl font-black">
                {new Intl.NumberFormat("ru-RU").format(pack.priceUzs)} сум
              </p>
              <p className="mt-3 flex items-center gap-2 text-lg font-bold">
                <Sparkle className="size-5 fill-current" />
                {pack.credits} кредитов
              </p>
              <div className="my-6 h-px bg-current opacity-10" />
              <p className="text-sm font-semibold">
                Хватит на {Math.floor(pack.credits / 4)} генераций
              </p>
              <Link
                href={entry.href}
                className={buttonClassName(
                  pack.popular ? "secondary" : "default",
                  pack.popular
                    ? "mt-7 w-full rounded-xl !text-white"
                    : "mt-7 w-full rounded-xl",
                  "lg",
                )}
              >
                Выбрать
                <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
        <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-[24px] border border-border bg-card p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-2xl font-black italic">+10 кредитов</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Новым пользователям — чтобы проверить Renoa без оплаты.
            </p>
          </div>
          <Link href={entry.href} className={buttonClassName("outline", "rounded-xl")}>
            Давайте попробуем
          </Link>
        </div>
      </div>
    </section>
  );
}

const stories = [
  {
    title: "Понятный старт",
    text: "Загрузка фото находится прямо на холсте — не нужно сначала создавать и настраивать проект.",
    icon: Upload,
  },
  {
    title: "Видимый процесс",
    text: "Исходник, новые варианты и ветки правок остаются рядом и не теряются в списках.",
    icon: Layers3,
  },
  {
    title: "Быстрые итерации",
    text: "Выберите результат и продолжайте уточнять его обычными словами.",
    icon: WandSparkles,
  },
  {
    title: "Безопасный баланс",
    text: "Стоимость видна заранее, а при технической ошибке кредиты возвращаются.",
    icon: Clock3,
  },
];

export function StoriesSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Опыт работы
        </p>
        <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
          Всё важное — перед глазами
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stories.map(({ title, text, icon: Icon }) => (
            <article
              key={title}
              className="min-h-64 rounded-[24px] border border-border bg-card p-6"
            >
              <Icon className="size-7 text-primary" aria-hidden="true" />
              <h3 className="mt-16 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  [
    "Какие фотографии подойдут лучше всего?",
    "Снимите комнату ровно, при дневном свете и без сильного размытия. Поддерживаются JPG, PNG и WEBP до 15 МБ.",
  ],
  [
    "Renoa сохранит окна и геометрию?",
    "Да. Базовая инструкция просит модель сохранять ракурс, пропорции и архитектурные элементы помещения.",
  ],
  [
    "Можно ли продолжить понравившийся вариант?",
    "Да. Выберите результат на холсте, откройте уточнение и опишите следующую правку.",
  ],
  [
    "Сколько стоит одна генерация?",
    "Одна генерация стоит 4 кредита. Текущий баланс и точная стоимость всегда видны перед запуском.",
  ],
  [
    "Что произойдёт при технической ошибке?",
    "Резерв автоматически возвращается на баланс, поэтому неудачная техническая попытка не оплачивается.",
  ],
  [
    "Нужны ли навыки дизайнера?",
    "Нет. Достаточно загрузить фото, выбрать стиль и написать пожелания обычным языком.",
  ],
];

export function FaqSection() {
  return (
    <section className="page-grid border-b border-border">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            FAQ
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            Частые вопросы
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Всё, что нужно знать перед первой генерацией.
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {faqs.map(([question, answer]) => (
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
  authenticated,
}: {
  authenticated: boolean;
}) {
  const entry = authEntry(authenticated);
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1180px] px-5 py-20 text-center sm:px-8 sm:py-28">
        <Sparkle className="mx-auto size-9 fill-current" aria-hidden="true" />
        <h2 className="mx-auto mt-5 max-w-4xl text-5xl font-black italic leading-[0.95] tracking-[-0.065em] sm:text-7xl">
          Всё ещё не уверены?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base font-medium opacity-75">
          Загрузите комнату и создайте первые варианты бесплатно. Карта не нужна.
        </p>
        <Link
          href={entry.href}
          className={buttonClassName(
            "secondary",
            "mt-8 rounded-xl bg-[#171719] px-7 !text-white hover:bg-[#27272a]",
            "lg",
          )}
        >
          Открыть Renoa
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
