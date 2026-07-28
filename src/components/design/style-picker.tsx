"use client";

import { Check } from "lucide-react";

export type StylePickerProps = {
  styles: Array<{ code: string; name: string; imageUrl: string }>;
  value: string | undefined;
  onChange(value: string | undefined): void;
};

export function StylePicker({ styles, value, onChange }: StylePickerProps) {
  return (
    <fieldset>
      <legend className="text-sm font-black text-foreground">Стиль</legend>
      <p className="mt-1 text-xs leading-5 text-muted">
        Выберите направление или оставьте интерьер без стилевого пресета.
      </p>
      <div className="mt-3 min-w-0 max-w-full overflow-hidden">
        <div
          className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain px-2 py-2"
          role="radiogroup"
          aria-label="Стиль интерьера"
        >
          {styles.map((style) => {
          const selected = value === style.code;
          return (
            <label
              key={style.code}
              className={`workspace-focus-proxy relative w-[116px] shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 bg-background transition-colors ${
                selected
                  ? "border-accent"
                  : "border-border hover:border-muted"
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
                    ? `${style.name}, выбран. Нажмите ещё раз, чтобы снять выбор`
                    : style.name
                }
              />
              <span className="block aspect-[4/3] overflow-hidden bg-surface-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={style.imageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              </span>
              <span className="block truncate px-2 py-2 text-xs font-bold">
                {style.name}
              </span>
              {selected && (
                <span
                  className="absolute top-2 right-2 grid size-6 place-items-center rounded-full border border-accent-foreground/20 bg-accent text-accent-foreground"
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
