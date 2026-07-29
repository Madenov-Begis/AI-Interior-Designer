import { HistoryGrid } from "@/components/history/history-grid";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="mb-7">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Проекты и итерации
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          История интерьеров
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Возвращайтесь к исходным комнатам и продолжайте любую ветку изменений.
        </p>
      </header>
      <HistoryGrid />
    </div>
  );
}
