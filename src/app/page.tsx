import { Hero } from "@/components/marketing/hero";
import { ProcessSection } from "@/components/marketing/process-section";
import { SiteHeader } from "@/components/marketing/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader authenticated={authenticated} />
      <Hero authenticated={authenticated} />
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
