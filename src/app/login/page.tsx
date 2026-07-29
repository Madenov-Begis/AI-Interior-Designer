import { KeyRound, ScanLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { APP_NAME } from "@/config/brand";
import { safeReturnPath } from "@/lib/auth/route-policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: `Вход — ${APP_NAME}`,
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-2xl shadow-black/35">
        <CardHeader className="p-6 sm:p-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ScanLine className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-black uppercase tracking-[0.12em]">{APP_NAME}</span>
          </Link>
          <p className="mt-8 font-mono text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">Личный кабинет</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Войдите, чтобы начать интерьер</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Ваши проекты, изображения и ветки изменений будут доступны на любом устройстве.</p>
        </CardHeader>
        <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
        <Link
          href={googleLoginUrl}
          className={buttonClassName("outline", "w-full justify-center", "lg")}
        >
          <KeyRound className="size-5" />
          Продолжить с Google
        </Link>
        <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          Google используется только для безопасного входа.
        </p>
        <Link href="/" className="mt-6 block text-center text-sm text-muted-foreground transition-colors hover:text-foreground">Вернуться на главную</Link>
        </CardContent>
      </Card>
    </main>
  );
}
