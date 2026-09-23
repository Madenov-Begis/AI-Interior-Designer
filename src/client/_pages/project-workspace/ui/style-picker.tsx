"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAppText } from "@/shared/providers";

export type StylePickerProps = {
  styles: Array<{ code: string; name: string; imageUrl: string }>;
  value: string | undefined;
  onChange(value: string | undefined): void;
};

export function StylePicker({ styles, value, onChange }: StylePickerProps) {
  const t = useAppText();
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleWheel = (event: WheelEvent) => {
      if (scroller.scrollWidth <= scroller.clientWidth) return;

      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (delta === 0) return;

      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      const nextScrollLeft = Math.max(
        0,
        Math.min(maxScrollLeft, scroller.scrollLeft + delta),
      );
      if (nextScrollLeft === scroller.scrollLeft) return;

      scroller.scrollLeft = nextScrollLeft;
      if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
        event.preventDefault();
      }
    };

    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", handleWheel);
  }, []);

  function scrollStyles(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({
      left: direction * 232,
      behavior: "smooth",
    });
  }

  return (
    <fieldset className="min-w-0 max-w-full overflow-hidden">
      <legend className="text-xs font-semibold text-foreground">{t("Стиль")}</legend>
      <div className="mt-2 flex min-w-0 justify-end gap-3">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => scrollStyles(-1)}
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={t("Показать предыдущие стили")}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollStyles(1)}
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={t("Показать следующие стили")}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-3 min-w-0 w-full max-w-full overflow-hidden">
        <div
          ref={scrollerRef}
          className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain py-2 [scrollbar-width:thin]"
          role="radiogroup"
          aria-label={t("Стиль интерьера")}
          tabIndex={0}
        >
          {styles.map((style) => {
            const selected = value === style.code;
            return (
              <label
                key={style.code}
                className={`workspace-focus-proxy relative w-[108px] shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-background transition-colors ${
                  selected
                    ? "border-primary ring-1 ring-primary/35"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <input
                  type="radio"
                  name="interior-style"
                  value={style.code}
                  checked={selected}
                  onClick={() => {
                    if (selected) onChange(undefined);
                  }}
                  onChange={() => {
                    if (!selected) onChange(style.code);
                  }}
                  className="sr-only"
                  aria-label={
                    selected
                      ? t("{style}, выбран. Нажмите ещё раз, чтобы снять выбор", {
                          style: t(style.name),
                        })
                      : t(style.name)
                  }
                />
                <span className="block aspect-[4/3] overflow-hidden bg-surface-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={style.imageUrl}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="block truncate px-2 py-2 text-xs font-semibold">
                  {t(style.name)}
                </span>
                {selected && (
                  <span
                    className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
                    aria-hidden="true"
                  >
                    <Check size={15} strokeWidth={3} />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
