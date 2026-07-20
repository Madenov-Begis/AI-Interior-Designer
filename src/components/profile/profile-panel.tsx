"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buttonClassName } from "@/components/ui/button";

type ProfilePayload = { profile: { email: string; displayName: string | null; role: string; status: string; timezone: string; createdAt: string }; usage: { used: number; limit: number | null; remaining: number | null; plan: { code: string; name: string; watermarkRequired: boolean } } };

async function apiData(response: Response) { const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message ?? "Запрос не выполнен"); return payload.data; }

export function ProfilePanel() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => apiData(await fetch("/api/v1/profile")) as Promise<ProfilePayload> });
  const nameInputRef = useRef<HTMLInputElement>(null);
  const update = useMutation({
    mutationFn: async () => apiData(await fetch("/api/v1/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: nameInputRef.current?.value.trim(), timezone: "Asia/Tashkent" }) })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
  if (profile.isLoading) return <p className="text-muted">Загружаем профиль…</p>;
  if (profile.error || !profile.data) return <p className="text-red-300">{profile.error?.message ?? "Профиль недоступен"}</p>;
  const { usage } = profile.data;
  const percent = usage.limit ? Math.min(100, usage.used / usage.limit * 100) : 0;
  return <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><section className="rounded-2xl border border-border bg-background p-5 sm:p-6"><p className="text-xs font-black tracking-[0.18em] text-accent uppercase">Аккаунт</p><h2 className="mt-2 text-2xl font-black italic">Личные данные</h2><label className="mt-6 grid gap-2 text-sm font-bold">Имя<input ref={nameInputRef} defaultValue={profile.data.profile.displayName ?? ""} maxLength={120} className="rounded-xl border border-border bg-surface px-4 py-3 font-normal outline-none focus:border-accent" /></label><label className="mt-4 grid gap-2 text-sm font-bold">Email<input value={profile.data.profile.email} disabled className="rounded-xl border border-border bg-surface-elevated px-4 py-3 font-normal text-muted" /></label>{update.error && <p className="mt-4 text-sm text-red-300">{update.error.message}</p>}<button type="button" onClick={() => update.mutate()} disabled={update.isPending} className={buttonClassName("primary", "mt-6 rounded-xl disabled:opacity-40")}>{update.isPending ? "Сохраняем…" : "Сохранить"}</button></section><aside className="rounded-2xl border border-border bg-background p-5 sm:p-6"><p className="text-xs font-black tracking-[0.18em] text-accent uppercase">Тариф</p><h2 className="mt-2 text-2xl font-black italic">{usage.plan.name}</h2><p className="mt-3 text-sm text-muted">Использовано сегодня: {usage.used} из {usage.limit ?? "∞"}</p>{usage.limit !== null && <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-elevated"><div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} /></div>}<div className="mt-6 space-y-3 border-t border-border pt-5 text-sm text-muted"><p>{usage.plan.watermarkRequired ? "Результаты с водяным знаком" : "Без водяного знака"}</p><p>Часовой пояс: Asia/Tashkent</p><p>Осталось сегодня: {usage.remaining ?? "без ограничений"}</p></div></aside></div>;
}
