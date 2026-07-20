const steps = [
  { number: "01", title: "Загрузите фото", copy: "Подойдёт обычная фотография комнаты со смартфона или камеры." },
  { number: "02", title: "Добавьте референсы", copy: "Покажите желаемые стили, мебель, материалы, цвета и освещение." },
  { number: "03", title: "Опишите результат", copy: "Добавьте инструкцию, выберите модель и запустите визуализацию." },
];

export function ProcessSection() {
  return (
    <section id="process" className="mx-auto max-w-7xl px-4 py-22 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black tracking-[0.2em] text-muted uppercase">Как это происходит</p>
        <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] italic sm:text-6xl">3 шага — и дизайн готов</h2>
        <p className="mt-5 text-base leading-7 text-muted sm:text-lg">Всё устроено так, чтобы вы быстро получили реалистичный результат без сложных профессиональных инструментов.</p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.number} className="group rounded-[var(--radius-lg)] border border-border bg-surface p-6 transition-colors hover:border-accent/45 sm:p-8">
            <div className="font-mono text-sm font-bold text-accent">{step.number}</div>
            <div className="mt-14 h-px bg-border transition-colors group-hover:bg-accent/40" />
            <h3 className="mt-6 text-2xl font-bold tracking-tight">{step.title}</h3>
            <p className="mt-3 leading-7 text-muted">{step.copy}</p>
          </article>
        ))}
      </div>
      <div id="examples" className="mt-20 rounded-[var(--radius-lg)] border border-border bg-surface p-6 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-accent uppercase">Рабочая область</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight italic sm:text-5xl">Весь проект на одном экране</h2>
            <p className="mt-5 leading-7 text-muted">Редактор разметки, референсы, текстовая инструкция, модель и формат собраны в последовательный процесс.</p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-border bg-background p-3 sm:grid-cols-[1fr_220px]">
            <div className="room-preview relative min-h-64 rounded-xl"><span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-2 text-xs">До / После</span></div>
            <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 text-sm"><b>Настройки дизайна</b><div className="rounded-lg bg-surface-elevated p-3 text-muted">3 референса</div><div className="rounded-lg bg-surface-elevated p-3 text-muted">Современный минимализм…</div><div className="mt-auto rounded-lg bg-accent p-3 text-center font-bold text-accent-foreground">Визуализировать →</div></div>
          </div>
        </div>
      </div>
      <div id="pricing" className="mt-20 border-t border-border pt-12 text-center text-muted">Тарифы и VIP-возможности появятся на следующем этапе.</div>
    </section>
  );
}
