"use client";

import { useState } from "react";

export function BeforeAfter({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string;
  afterUrl: string;
}) {
  const [position, setPosition] = useState(50);
  return (
    <figure
      className="relative m-0 overflow-hidden rounded-2xl border border-border bg-black"
      style={{ aspectRatio: "16 / 10" }}
    >
      {/* Private signed URLs are short lived and rendered without the Next image cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl}
        alt="Интерьер до изменения"
        className="absolute inset-0 size-full object-contain"
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt="Интерьер после изменения"
          className="absolute inset-0 size-full object-contain"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_#000]"
        style={{ left: `${position}%` }}
      />
      <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold">
        До
      </span>
      <span className="absolute top-3 right-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
        После
      </span>
      <input
        aria-label="Сравнение изображения до и после"
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </figure>
  );
}
