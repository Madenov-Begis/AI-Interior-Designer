"use client";

import {
  Check,
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
import {
  forwardRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";
import type { VisualPromptTool } from "@/features/visual-prompt";
import {
  Field,
  FieldGroup,
  FieldLabel,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Slider,
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/ui";
import { cn } from "@/shared/lib";

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
  { id: "eraser", label: "Стирать разметку", icon: Eraser },
];

const COLORS = [
  { value: "#afea4d", label: "Лаймовый" },
  { value: "#ff7474", label: "Красный" },
  { value: "#58a6ff", label: "Синий" },
  { value: "#f5f5f1", label: "Белый" },
  { value: "#f2b84b", label: "Жёлтый" },
];

type ToolbarButtonProps = Omit<
  ComponentProps<"button">,
  "aria-label" | "title"
> & {
  label: string;
  pressed?: boolean;
};

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton(
    { label, pressed, className, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={pressed}
        data-active={pressed || undefined}
        className={cn(
          "workspace-toolbar__button disabled:pointer-events-none disabled:opacity-30",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

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
  onClear,
}: WorkspaceToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasDrawingSettings =
    tool === "pen" ||
    tool === "marker" ||
    tool === "rectangle" ||
    tool === "eraser";
  const hasColorSettings = tool !== "eraser";

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

        {hasDrawingSettings ? (
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <ToolbarButton label="Цвет и толщина" pressed={settingsOpen}>
                <span
                  className="relative grid size-5 place-items-center"
                  style={hasColorSettings ? { color } : undefined}
                >
                  <SlidersHorizontal size={19} strokeWidth={2.1} />
                  {hasColorSettings ? (
                    <span
                      className="absolute -right-1 -bottom-1 size-2.5 rounded-full border border-surface"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
              </ToolbarButton>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="center"
              sideOffset={10}
              collisionPadding={12}
              className="w-80"
            >
              <PopoverHeader>
                <PopoverTitle>Параметры разметки</PopoverTitle>
                <PopoverDescription>
                  {hasColorSettings
                    ? "Выберите цвет и толщину линии"
                    : "Настройте толщину ластика"}
                </PopoverDescription>
              </PopoverHeader>

              <FieldGroup className="mt-5 gap-5">
                {hasColorSettings ? (
                  <>
                    <Field>
                      <FieldLabel>Цвет</FieldLabel>
                      <ToggleGroup
                        type="single"
                        value={
                          COLORS.some(
                            ({ value }) => value === color.toLowerCase(),
                          )
                            ? color.toLowerCase()
                            : ""
                        }
                        onValueChange={(value) => {
                          if (value) onColorChange(value);
                        }}
                        spacing={2}
                        aria-label="Цвет линии"
                      >
                        {COLORS.map((preset) => {
                          const selected =
                            color.toLowerCase() === preset.value.toLowerCase();

                          return (
                            <ToggleGroupItem
                              key={preset.value}
                              value={preset.value}
                              aria-label={preset.label}
                              title={preset.label}
                              className={cn(
                                "size-9 rounded-full border-2 p-0",
                                selected
                                  ? "border-foreground"
                                  : "border-transparent",
                              )}
                              style={{ backgroundColor: preset.value }}
                            >
                              {selected ? (
                                <Check
                                  className="text-black"
                                  aria-hidden="true"
                                />
                              ) : null}
                            </ToggleGroupItem>
                          );
                        })}
                      </ToggleGroup>
                    </Field>

                    <Field>
                      <FieldLabel className="w-full cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5">
                        <span>Свой цвет</span>
                        <span className="flex items-center gap-2 font-mono text-xs uppercase text-muted-foreground">
                          <span
                            className="size-5 rounded-full border border-border"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          />
                          {color}
                        </span>
                        <input
                          type="color"
                          value={color}
                          onChange={(event) =>
                            onColorChange(event.target.value)
                          }
                          className="sr-only"
                          aria-label="Выбрать свой цвет"
                        />
                      </FieldLabel>
                    </Field>
                  </>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="workspace-stroke-width">
                    {tool === "eraser" ? "Толщина ластика" : "Толщина линии"}
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {strokeWidth}px
                    </span>
                  </FieldLabel>
                  <Slider
                    id="workspace-stroke-width"
                    min={tool === "eraser" ? 16 : 2}
                    max={tool === "eraser" ? 96 : 48}
                    step={tool === "eraser" ? 2 : 1}
                    value={[strokeWidth]}
                    onValueChange={([value]) => {
                      if (value !== undefined) onStrokeWidthChange(value);
                    }}
                    aria-label={
                      tool === "eraser" ? "Толщина ластика" : "Толщина линии"
                    }
                  />
                </Field>
              </FieldGroup>
            </PopoverContent>
          </Popover>
        ) : null}

        <ToolbarButton label="Отменить" disabled={!canUndo} onClick={onUndo}>
          <Undo2 size={19} strokeWidth={2.1} />
        </ToolbarButton>
        <ToolbarButton label="Повторить" disabled={!canRedo} onClick={onRedo}>
          <Redo2 size={19} strokeWidth={2.1} />
        </ToolbarButton>
        <ToolbarButton label="Удалить всю разметку" onClick={onClear}>
          <Trash2 size={19} strokeWidth={2.1} />
        </ToolbarButton>
      </div>
    </div>
  );
}
