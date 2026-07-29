"use client";

import {
  Eraser,
  Highlighter,
  MousePointer2,
  PenLine,
  Redo2,
  SlidersHorizontal,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import type { VisualPromptTool } from "@/features/visual-prompt/types";

export type WorkspaceToolbarProps = {
  tool: VisualPromptTool;
  color: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange(tool: VisualPromptTool): void;
  onColorChange(color: string): void;
  onStrokeWidthChange(width: number): void;
  onUndo(): void;
  onRedo(): void;
  onDelete(): void;
  onClear(): void;
};

const TOOLS: Array<{
  id: VisualPromptTool;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  {
    id: "select",
    label: "Выбирать объекты и перемещать холст",
    icon: MousePointer2,
  },
  { id: "pen", label: "Рисовать ручкой", icon: PenLine },
  { id: "marker", label: "Рисовать маркером", icon: Highlighter },
  { id: "rectangle", label: "Выделить прямоугольником", icon: Square },
];

const COLORS = ["#afea4d", "#ff7474", "#58a6ff", "#f5f5f1", "#f2b84b"];

function ToolbarButton({
  label,
  pressed,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      data-active={pressed || undefined}
      disabled={disabled}
      onClick={onClick}
      className="workspace-toolbar__button disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function WorkspaceToolbar({
  tool,
  color,
  strokeWidth,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onDelete,
  onClear,
}: WorkspaceToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasDrawingSettings =
    tool === "pen" || tool === "marker" || tool === "rectangle";

  return (
    <div className="workspace-toolbar" aria-label="Инструменты разметки">
      <div className="workspace-toolbar__rail">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <ToolbarButton
            key={id}
            label={label}
            pressed={tool === id}
            onClick={() => {
              onToolChange(id);
              if (id === "select") setSettingsOpen(false);
            }}
          >
            <Icon size={19} strokeWidth={2.1} />
          </ToolbarButton>
        ))}

        <span className="workspace-toolbar__divider" aria-hidden="true" />

        {hasDrawingSettings && (
          <ToolbarButton
            label="Цвет и толщина"
            pressed={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <span
              className="relative grid size-5 place-items-center"
              style={{ color }}
            >
              <SlidersHorizontal size={19} strokeWidth={2.1} />
              <span
                className="absolute -right-1 -bottom-1 size-2.5 rounded-full border border-surface"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
            </span>
          </ToolbarButton>
        )}

        <ToolbarButton label="Отменить" disabled={!canUndo} onClick={onUndo}>
          <Undo2 size={19} strokeWidth={2.1} />
        </ToolbarButton>
        <ToolbarButton label="Повторить" disabled={!canRedo} onClick={onRedo}>
          <Redo2 size={19} strokeWidth={2.1} />
        </ToolbarButton>
        <ToolbarButton label="Удалить выбранное" onClick={onDelete}>
          <Trash2 size={19} strokeWidth={2.1} />
        </ToolbarButton>
        <ToolbarButton label="Очистить разметку" onClick={onClear}>
          <Eraser size={19} strokeWidth={2.1} />
        </ToolbarButton>
      </div>

      {hasDrawingSettings && settingsOpen && (
        <div className="workspace-toolbar__popover" role="dialog" aria-label="Параметры инструмента">
          <div>
            <p className="text-xs font-bold text-muted">Цвет</p>
            <div className="mt-2 flex items-center gap-2">
              {COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={`Выбрать цвет ${preset}`}
                  title={`Цвет ${preset}`}
                  aria-pressed={
                    color.toLowerCase() === preset.toLowerCase()
                  }
                  onClick={() => onColorChange(preset)}
                  className="grid size-11 shrink-0 place-items-center rounded-lg"
                >
                  <span
                    className={`size-6 rounded-full border-2 ${
                      color.toLowerCase() === preset.toLowerCase()
                        ? "border-foreground"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: preset }}
                    aria-hidden="true"
                  />
                </button>
              ))}
              <label
                className="workspace-focus-proxy relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg"
                title="Другой цвет"
              >
                <span className="sr-only">Другой цвет</span>
                <span
                  className="size-7 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <input
                  type="color"
                  value={color}
                  onChange={(event) => onColorChange(event.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>
          <label className="mt-4 grid gap-2 text-xs font-bold text-muted">
            Толщина: {strokeWidth}px
            <input
              type="range"
              min="2"
              max="48"
              value={strokeWidth}
              onChange={(event) =>
                onStrokeWidthChange(Number(event.target.value))
              }
              className="h-11 w-48 accent-[var(--accent)]"
            />
          </label>
        </div>
      )}
    </div>
  );
}
