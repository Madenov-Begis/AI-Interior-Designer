import Image from "next/image";
import Link from "next/link";
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
import { marketingCtaClassName } from "./cta-style";

const modes = [
  {
    title: "Сохранить геометрию",
    copy: "Ruvie оставляет стены, окна и ракурс на месте, меняя только интерьер.",
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

export function InteriorModesSection() {
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
          href="/app"
          className={buttonClassName(
            "default",
            marketingCtaClassName("mt-8 rounded-2xl px-7"),
            "lg",
          )}
        >
          Создать свой интерьер
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  const items = [
    { icon: Upload, text: "Фото сразу появляется на холсте" },
    { icon: MousePointer2, text: "Все варианты остаются рядом" },
    { icon: MessageSquareText, text: "Правки пишутся обычным текстом" },
    { icon: Layers3, text: "История изменений всегда перед глазами" },
  ];

  return (
    <section className="border-b border-border bg-[#1a1c1f]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Один рабочий экран
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            Не потеряйте удачный вариант
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Исходное фото, все варианты и дальнейшие правки остаются на одном
            холсте. Можно сравнивать идеи и продолжать с любой версии.
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
            href="/app"
            className={buttonClassName(
              "default",
              marketingCtaClassName("mt-7 rounded-2xl px-7"),
              "lg",
            )}
          >
            Загрузить фото бесплатно
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="rounded-[26px] border border-border bg-card p-3 shadow-2xl shadow-black/35">
          <div className="page-grid relative aspect-[16/10] overflow-hidden rounded-[18px] border border-border bg-background">
            <div className="absolute inset-x-6 top-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <RuvieWordmark />
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
              <p className="p-3 text-xs font-semibold">Вариант 01</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const stories = [
  {
    title: "Планируете ремонт",
    text: "Проверьте стиль, цвета и мебель до того, как заказывать материалы и начинать работы.",
    icon: Home,
  },
  {
    title: "Работаете дизайнером",
    text: "Быстро соберите несколько направлений для первой встречи и развивайте выбранную идею.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Готовите объект к продаже",
    text: "Покажите потенциал пустой или незавершённой комнаты без физического хоумстейджинга.",
    icon: Building2,
  },
  {
    title: "Обновляете одну комнату",
    text: "Сравните несколько идей и поймите, какое направление действительно подходит вашему дому.",
    icon: Palette,
  },
];

export function StoriesSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Для дома и работы
        </p>
        <h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
          Подойдёт, если вы…
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
    "Ruvie сохранит окна и геометрию?",
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
  [
    "Нужно ли оплачивать сразу?",
    "Нет. После регистрации вы получите 10 кредитов — этого хватит на две генерации. Банковская карта для старта не нужна.",
  ],
];

export function FaqSection() {
  return (
    <section className="border-b border-border bg-[#151719]">
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

export function FinalCtaSection() {
  return (
    <section className="bg-[#111315] px-4 py-5 sm:px-6 sm:py-8">
      <div className="relative mx-auto min-h-[500px] max-w-[1320px] overflow-hidden rounded-[34px]">
        <Image
          src="/images/interior-styles/neoclassic.webp"
          alt="Светлый интерьер в неоклассическом стиле"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/10" />
        <div className="relative flex min-h-[500px] max-w-2xl flex-col justify-end p-7 sm:p-12 lg:p-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Начните с одной комнаты
          </p>
          <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.06em] sm:text-6xl">
            Начните с фотографии своей комнаты
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/65">
            Получите два первых варианта бесплатно и решайте, стоит ли
            продолжать, уже после результата.
          </p>
          <div className="mt-8">
            <Link
              href="/app"
              className={buttonClassName(
                "default",
                marketingCtaClassName("rounded-full px-7 shadow-none"),
                "lg",
              )}
            >
              Загрузить фото бесплатно
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
