import Image from "next/image";
import { GitBranch, ImageUp, MessageSquareText } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Добавьте фотографию",
    copy: "Подойдёт обычный снимок комнаты со смартфона.",
    icon: ImageUp,
  },
  {
    number: "02",
    title: "Опишите желаемое",
    copy: "Выберите стиль и напишите, что хотите сохранить или заменить.",
    icon: MessageSquareText,
  },
  {
    number: "03",
    title: "Развивайте результат",
    copy: "Сравнивайте варианты и продолжайте правки от понравившейся версии.",
    icon: GitBranch,
  },
];

export function ProcessSection() {
  return (
    <section
      id="process"
      className="border-b border-black/10 bg-[#f1eee6] text-[#18191b]"
    >
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5d702f]">
            От фото до идеи
          </p>
          <h2 className="mt-4 max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.06em] sm:text-6xl">
            Просто начать. Легко продолжить.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-black/55">
            Ruvie не заставляет проходить длинный мастер настроек. Вся работа
            строится вокруг вашей комнаты и остаётся в одном проекте.
          </p>
          <div className="relative mt-9 overflow-hidden rounded-[28px] bg-[#d9d5cb] p-2 shadow-[0_24px_70px_rgba(33,31,26,0.14)]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[22px]">
              <Image
                src="/images/interior-styles/modern.webp"
                alt="Современная визуализация интерьера"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <ol className="divide-y divide-black/10 border-y border-black/10">
          {steps.map(({ number, title, copy, icon: Icon }) => (
            <li
              key={number}
              className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:py-10"
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
          ))}
        </ol>
      </div>
    </section>
  );
}
