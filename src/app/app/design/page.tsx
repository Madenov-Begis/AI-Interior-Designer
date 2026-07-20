import Link from "next/link";
import { redirect } from "next/navigation";
import { SourceUpload } from "@/components/design/source-upload";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DesignPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <main className="min-h-screen bg-background p-3 text-foreground sm:p-5">
      <div className="mx-auto max-w-[1500px] rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:p-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div><Link href="/app" className="text-sm text-muted hover:text-foreground">← Рабочая область</Link><h1 className="mt-2 text-3xl font-black italic sm:text-4xl">Новый интерьер</h1></div>
          <div className="flex gap-2 text-xs"><span className="rounded-full bg-accent px-4 py-2 font-bold text-accent-foreground">1 Фото</span><span className="rounded-full bg-surface-elevated px-4 py-2 text-muted">2 Референсы</span><span className="rounded-full bg-surface-elevated px-4 py-2 text-muted">3 Инструкция</span></div>
        </header>
        <div className="mt-6"><SourceUpload /></div>
      </div>
    </main>
  );
}
