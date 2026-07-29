"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { RenoaAppHeader } from "@/components/design-system/app-header";
import type { RenoaUserSummary } from "@/components/design-system/account-menu";

type SaveState = "idle" | "saving" | "saved" | "error";

type WorkspaceHeaderProps = {
  projectId: string;
  initialName: string;
  user: RenoaUserSummary;
  creditBalance?: number | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
};

async function readError(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? "Не удалось сохранить название проекта",
    );
  }
}

export function WorkspaceHeader({
  projectId,
  initialName,
  user,
  creditBalance,
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
    <RenoaAppHeader
      user={user}
      creditBalance={creditBalance}
      middle={
        <div className="max-w-[260px]">
          <label className="sr-only" htmlFor="workspace-project-name">
            Название проекта
          </label>
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
            className="w-full truncate rounded-lg bg-transparent px-2 py-1 text-sm font-semibold outline-none transition-colors hover:bg-secondary focus:bg-secondary"
          />
          <p
            className={`h-3 px-2 text-[9px] ${
              saveState === "error"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
            aria-live="polite"
          >
            {saveMessage}
          </p>
        </div>
      }
    />
  );
}
