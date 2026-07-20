import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="page-grid hero-glow relative isolate min-h-[690px] border-b border-border">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-18 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
        <div className="text-center lg:text-left">
          <p className="mb-5 text-xs font-black tracking-[0.22em] text-accent uppercase">Интерьер нового уровня за несколько минут</p>
          <h1 className="text-[clamp(3.2rem,7vw,6.5rem)] leading-[.92] font-black tracking-[-0.065em] italic">
            Преобразите комнату,
            <span className="mt-2 block text-accent">сохранив её реальность</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-muted sm:text-lg lg:mx-0">
            Загрузите фотографию, добавьте референсы и получите фотореалистичный дизайн без изменения ракурса, пропорций и геометрии помещения.
          </p>
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/login" className={buttonClassName("primary", "min-h-14 w-full px-7 text-base sm:w-auto")}>Создать новый интерьер <span aria-hidden="true">→</span></Link>
            <a href="#process" className={buttonClassName("secondary", "min-h-14 w-full px-7 text-base sm:w-auto")}>Как это работает</a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]" aria-label="Пример редактора интерьера">
          <div className="absolute -inset-4 rounded-[2rem] bg-accent/8 blur-3xl" />
          <div className="relative rounded-[1.6rem] border border-border bg-surface p-3 shadow-2xl shadow-black/40">
            <div className="mb-3 flex items-center justify-between px-2 py-1 text-xs text-muted">
              <span className="font-mono">living-room.jpg</span>
              <span className="text-accent">● Фото готово</span>
            </div>
            <div className="room-preview relative aspect-[4/3] overflow-hidden rounded-xl border border-white/5">
              <div className="absolute right-4 bottom-4 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs backdrop-blur">✎ Разметить фото</div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-surface-elevated px-2 py-3 text-accent"><b>01</b><br />Фото</div>
              <div className="rounded-lg bg-surface-elevated px-2 py-3 text-muted"><b>02</b><br />Референсы</div>
              <div className="rounded-lg bg-surface-elevated px-2 py-3 text-muted"><b>03</b><br />Инструкция</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
