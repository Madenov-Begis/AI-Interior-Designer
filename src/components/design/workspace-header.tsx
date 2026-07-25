"use client";

import Link from "next/link";
import { type KeyboardEvent, useRef, useState } from "react";

type SaveState = "idle" | "saving" | "saved" | "error";

type WorkspaceHeaderProps = {
  projectId: string;
  initialName: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
};

async function readError(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Не удалось сохранить название проекта");
  }
}

export function WorkspaceHeader({
  projectId,
  initialName,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: WorkspaceHeaderProps) {
  const confirmedNameRef = useRef(initialName);
  const [name, setName] = useState(initialName);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function saveName() {
    const nextName = name.trim();
    if (!nextName) {
      setName(confirmedNameRef.current);
      setSaveState("error");
      return;
    }
    if (nextName === confirmedNameRef.current) {
      setName(nextName);
      setSaveState("idle");
      return;
    }

    setSaveState("saving");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      await readError(response);
      confirmedNameRef.current = nextName;
      setName(nextName);
      setSaveState("saved");
    } catch {
      setName(confirmedNameRef.current);
      setSaveState("error");
    }
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setName(confirmedNameRef.current);
      setSaveState("idle");
      event.currentTarget.blur();
    }
  }

  const saveMessage = {
    idle: "",
    saving: "Сохраняем…",
    saved: "Сохранено",
    error: "Название не сохранено",
  }[saveState];

  return (
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:px-5">
      <Link href="/app" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-muted transition-colors hover:bg-surface-elevated hover:text-foreground">
        <span aria-hidden="true">＋</span><span className="hidden sm:inline">Новый дизайн</span>
      </Link>
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="workspace-project-name">Название проекта</label>
        <input
          id="workspace-project-name"
          value={name}
          maxLength={120}
          onChange={(event) => {
            setName(event.target.value);
            setSaveState("idle");
          }}
          onBlur={() => void saveName()}
          onKeyDown={handleNameKeyDown}
          className="w-full max-w-md rounded-lg bg-transparent px-2 py-2 text-sm font-black outline-none transition-colors hover:bg-surface-elevated focus:bg-surface-elevated sm:text-base"
        />
        <p className={`h-4 px-2 text-[11px] ${saveState === "error" ? "text-red-300" : "text-muted"}`} aria-live="polite">{saveMessage}</p>
      </div>
      <div className="hidden items-center gap-1 md:flex">
        <button type="button" onClick={onUndo} disabled={!canUndo} className="min-h-11 rounded-lg px-3 text-sm font-bold text-muted transition-colors hover:bg-surface-elevated hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35">Отменить</button>
        <button type="button" onClick={onRedo} disabled={!canRedo} className="min-h-11 rounded-lg px-3 text-sm font-bold text-muted transition-colors hover:bg-surface-elevated hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35">Повторить</button>
      </div>
      <Link href="/app/history" className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-bold text-muted transition-colors hover:bg-surface-elevated hover:text-foreground sm:inline-flex">История</Link>
      <Link href="/app/profile" className="inline-flex min-h-11 items-center rounded-full bg-surface-elevated px-3 text-sm font-bold transition-colors hover:bg-border" aria-label="Открыть профиль">Профиль</Link>
    </header>
  );
}
