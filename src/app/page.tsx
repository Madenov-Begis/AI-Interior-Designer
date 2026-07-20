import { Hero } from "@/components/marketing/hero";
import { ProcessSection } from "@/components/marketing/process-section";
import { SiteHeader } from "@/components/marketing/site-header";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <div className="ticker" aria-hidden="true">
        <div className="ticker__track">
          <span>СОХРАНЯЕМ ГЕОМЕТРИЮ</span>
          <b>✦</b>
          <span>ФОТОРЕАЛИСТИЧНЫЙ РЕЗУЛЬТАТ</span>
          <b>✦</b>
          <span>РЕФЕРЕНСЫ И РАЗМЕТКА</span>
          <b>✦</b>
          <span>В ПАРУ КЛИКОВ</span>
          <b>✦</b>
          <span>СОХРАНЯЕМ ГЕОМЕТРИЮ</span>
        </div>
      </div>
      <ProcessSection />
    </main>
  );
}
