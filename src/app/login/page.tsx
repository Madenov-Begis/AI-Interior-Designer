import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { safeReturnPath } from "@/lib/auth/route-policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Вход — AI Interior Designer",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturnPath(params.next ?? null);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect(next);

  const googleLoginUrl = `/api/v1/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <main className="page-grid hero-glow flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-2xl shadow-black/35 sm:p-9">
        <Link href="/" className="text-lg font-black tracking-tight italic">AI Interior Designer</Link>
        <p className="mt-10 text-xs font-black tracking-[0.2em] text-accent uppercase">Личный кабинет</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] italic">Войдите, чтобы начать дизайн</h1>
        <p className="mt-4 leading-7 text-muted">Загружайте фотографии, сохраняйте проекты и возвращайтесь к истории генераций.</p>
        <Link
          href={googleLoginUrl}
          className={buttonClassName("secondary", "mt-8 w-full justify-center rounded-xl")}
        >
          <span className="grid size-7 place-items-center rounded-full bg-foreground font-bold text-background">G</span>
          Продолжить с Google
        </Link>
        <p className="mt-3 text-center text-xs text-muted">Мы используем Google только для безопасного входа.</p>
        <Link href="/" className="mt-8 block text-center text-sm text-muted transition-colors hover:text-foreground">← Вернуться на главную</Link>
      </section>
    </main>
  );
}
