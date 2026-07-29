"use client";

import {
  Coins,
  History,
  Plus,
  Redo2,
  ScanLine,
  Undo2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, useRef, useState } from "react";
import { APP_NAME } from "@/config/brand";
import { Button } from "@/components/ui/button";

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
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
      <Link
        href="/app"
        className="mr-1 hidden items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex"
        aria-label={`${APP_NAME} — новый интерьер`}
      >
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <ScanLine className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="hidden text-sm font-black uppercase tracking-[0.12em] lg:inline">
          {APP_NAME}
        </span>
      </Link>
      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
      <Link
        href="/app"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent-surface hover:text-foreground"
        aria-label="Создать новый интерьер"
      >
        <Plus className="size-[18px]" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1 px-1">
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
          className="w-full max-w-md rounded-lg bg-transparent px-2 py-1.5 text-sm font-semibold outline-none transition-colors hover:bg-accent-surface focus:bg-accent-surface"
        />
        <p className={`h-3 px-2 font-mono text-[9px] ${saveState === "error" ? "text-red-300" : "text-muted-foreground"}`} aria-live="polite">{saveMessage}</p>
      </div>
      <div className="hidden items-center gap-1 lg:flex">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Отменить">
          <Undo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} aria-label="Повторить">
          <Redo2 className="size-4" />
        </Button>
      </div>
      <Link href="/app/history" className="hidden size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent-surface hover:text-foreground md:flex" aria-label="История">
        <History className="size-[18px]" />
      </Link>
      <Link href="/app/credits" className="hidden h-10 items-center gap-2 rounded-lg border border-primary/25 bg-primary/8 px-3 font-mono text-xs font-semibold text-primary transition-colors hover:bg-primary/12 sm:flex">
        <Coins className="size-4" />
        4 / генерация
      </Link>
      <Link href="/app/profile" className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground" aria-label="Открыть профиль">
        <UserRound className="size-[18px]" />
      </Link>
    </header>
  );
}
