"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas, Rect as FabricRect } from "fabric";
import { buttonClassName } from "@/components/ui/button";
import type { VisualPromptCanvasState, VisualPromptTool } from "@/features/visual-prompt/types";

type Props = {
  projectId: string;
  imageUrl: string;
  editorWidth: number;
  editorHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  initialState: VisualPromptCanvasState | null;
};

const TOOLS: Array<{ id: VisualPromptTool; label: string; hint: string }> = [
  { id: "select", label: "Выбор", hint: "Перемещение и изменение объектов" },
  { id: "pen", label: "Ручка", hint: "Точная линия" },
  { id: "marker", label: "Маркер", hint: "Полупрозрачная область" },
  { id: "rectangle", label: "Прямоугольник", hint: "Выделение зоны" },
];

function dataUrlToBlob(dataUrl: string) {
  return fetch(dataUrl).then((response) => response.blob());
}

export function VisualPromptEditor(props: Props) {
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const loadingHistoryRef = useRef(false);
  const rectangleRef = useRef<FabricRect | null>(null);
  const rectangleStartRef = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<VisualPromptTool>("pen");
  const [color, setColor] = useState("#b8ff3d");
  const [width, setWidth] = useState(12);
  const toolRef = useRef<VisualPromptTool>(tool);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(props.initialState ? "Сохранённая разметка восстановлена" : "Нарисуйте области, которые нужно изменить");

  const updateHistoryControls = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current >= 0 && historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const configureCanvas = useCallback((canvas: Canvas, nextTool: VisualPromptTool, nextColor: string, nextWidth: number) => {
    const drawing = nextTool === "pen" || nextTool === "marker";
    canvas.isDrawingMode = drawing;
    canvas.selection = nextTool === "select";
    canvas.defaultCursor = nextTool === "rectangle" ? "crosshair" : "default";
    canvas.forEachObject((object) => object.set({ selectable: nextTool === "select", evented: nextTool === "select" }));
    if (drawing && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = nextWidth;
      canvas.freeDrawingBrush.color = nextTool === "marker" ? `${nextColor}66` : nextColor;
    }
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, []);

  const captureHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || loadingHistoryRef.current) return;
    const snapshot = JSON.stringify(canvas.toJSON());
    if (historyRef.current[historyIndexRef.current] === snapshot) return;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snapshot);
    historyIndexRef.current = historyRef.current.length - 1;
    updateHistoryControls();
  }, [updateHistoryControls]);

  const loadSnapshot = useCallback(async (snapshot: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    loadingHistoryRef.current = true;
    canvas.discardActiveObject();
    await canvas.loadFromJSON(JSON.parse(snapshot));
    configureCanvas(canvas, toolRef.current, colorRef.current, widthRef.current);
    loadingHistoryRef.current = false;
    updateHistoryControls();
  }, [configureCanvas, updateHistoryControls]);

  useEffect(() => {
    if (!canvasElementRef.current) return;
    let disposed = false;
    let canvas: Canvas | null = null;

    void import("fabric").then(async ({ Canvas: FabricCanvas, PencilBrush, Rect }) => {
      if (disposed || !canvasElementRef.current) return;
      canvas = new FabricCanvas(canvasElementRef.current, {
        width: props.editorWidth,
        height: props.editorHeight,
        preserveObjectStacking: true,
        selection: false,
        fireRightClick: false,
        stopContextMenu: true,
      });
      canvasRef.current = canvas;
      canvas.freeDrawingBrush = new PencilBrush(canvas);

      const wrapper = canvas.wrapperEl;
      wrapper.style.width = "100%";
      wrapper.style.height = "auto";
      wrapper.style.aspectRatio = `${props.editorWidth} / ${props.editorHeight}`;
      wrapper.classList.add("visual-prompt-canvas");

      const changed = () => captureHistory();
      canvas.on("path:created", changed);
      canvas.on("object:modified", changed);
      canvas.on("object:removed", changed);

      canvas.on("mouse:down", (event) => {
        if (toolRef.current !== "rectangle" || !event.scenePoint) return;
        const start = event.scenePoint;
        rectangleStartRef.current = { x: start.x, y: start.y };
        rectangleRef.current = new Rect({
          left: start.x,
          top: start.y,
          width: 0,
          height: 0,
          fill: `${colorRef.current}24`,
          stroke: colorRef.current,
          strokeWidth: widthRef.current,
          selectable: false,
          evented: false,
          strokeUniform: true,
        });
        canvas?.add(rectangleRef.current);
      });
      canvas.on("mouse:move", (event) => {
        const start = rectangleStartRef.current;
        const rect = rectangleRef.current;
        if (toolRef.current !== "rectangle" || !start || !rect || !event.scenePoint) return;
        const point = event.scenePoint;
        rect.set({
          left: Math.min(start.x, point.x),
          top: Math.min(start.y, point.y),
          width: Math.abs(point.x - start.x),
          height: Math.abs(point.y - start.y),
        });
        rect.setCoords();
        canvas?.requestRenderAll();
      });
      canvas.on("mouse:up", () => {
        if (!rectangleRef.current) return;
        rectangleRef.current.set({ selectable: false, evented: false });
        rectangleRef.current = null;
        rectangleStartRef.current = null;
        captureHistory();
      });

      if (props.initialState?.version === 1 && props.initialState.fabric) {
        loadingHistoryRef.current = true;
        await canvas.loadFromJSON(props.initialState.fabric);
        canvas.requestRenderAll();
        loadingHistoryRef.current = false;
      }
      configureCanvas(canvas, toolRef.current, colorRef.current, widthRef.current);
      captureHistory();
    });

    return () => {
      disposed = true;
      canvasRef.current = null;
      if (canvas) void canvas.dispose();
    };
  }, [captureHistory, configureCanvas, props.editorHeight, props.editorWidth, props.initialState]);

  useEffect(() => {
    toolRef.current = tool;
    colorRef.current = color;
    widthRef.current = width;
    const canvas = canvasRef.current;
    if (!canvas) return;
    configureCanvas(canvas, tool, color, width);
  }, [color, configureCanvas, tool, width]);

  async function undo() {
    if (!canUndo) return;
    historyIndexRef.current -= 1;
    await loadSnapshot(historyRef.current[historyIndexRef.current]);
  }

  async function redo() {
    if (!canRedo) return;
    historyIndexRef.current += 1;
    await loadSnapshot(historyRef.current[historyIndexRef.current]);
  }

  function deleteSelected() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const selected = canvas.getActiveObjects();
    if (!selected.length) return setMessage("Сначала выберите объект");
    canvas.discardActiveObject();
    selected.forEach((object) => canvas.remove(object));
    canvas.requestRenderAll();
    captureHistory();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    loadingHistoryRef.current = true;
    canvas.getObjects().forEach((object) => canvas.remove(object));
    loadingHistoryRef.current = false;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    captureHistory();
    setMessage("Разметка очищена. Сохраните или восстановите оригинал");
  }

  async function restoreOriginal() {
    clearCanvas();
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/projects/${props.projectId}/visual-prompt`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось восстановить оригинал");
      setMessage("Оригинальное изображение восстановлено");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось восстановить оригинал");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || saving) return;
    if (canvas.getObjects().length === 0) return setMessage("Добавьте хотя бы одну отметку или восстановите оригинал");
    setSaving(true);
    setMessage("Сохраняем разметку…");
    try {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const state: VisualPromptCanvasState = {
        version: 1,
        coordinateSpace: {
          editorWidth: props.editorWidth,
          editorHeight: props.editorHeight,
          sourceWidth: props.sourceWidth,
          sourceHeight: props.sourceHeight,
        },
        fabric: canvas.toJSON() as Record<string, unknown>,
      };
      const overlay = await dataUrlToBlob(canvas.toDataURL({ format: "png", multiplier: 1 }));
      const formData = new FormData();
      formData.set("overlay", overlay, "visual-prompt.png");
      formData.set("canvasState", JSON.stringify(state));
      const response = await fetch(`/api/v1/projects/${props.projectId}/visual-prompt`, { method: "PUT", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Не удалось сохранить разметку");
      setMessage("Разметка сохранена. Можно переходить к референсам");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить разметку");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {TOOLS.map((item) => (
            <button key={item.id} type="button" title={item.hint} onClick={() => setTool(item.id)} className={`rounded-lg px-3 py-2 text-sm font-bold ${tool === item.id ? "bg-accent text-accent-foreground" : "bg-surface-elevated text-muted hover:text-foreground"}`}>
              {item.label}
            </button>
          ))}
          <span className="mx-1 hidden h-7 w-px bg-border sm:block" />
          <button type="button" onClick={() => void undo()} disabled={!canUndo} className="rounded-lg bg-surface-elevated px-3 py-2 text-sm disabled:opacity-35">↶ Отменить</button>
          <button type="button" onClick={() => void redo()} disabled={!canRedo} className="rounded-lg bg-surface-elevated px-3 py-2 text-sm disabled:opacity-35">↷ Вернуть</button>
          <button type="button" onClick={deleteSelected} className="rounded-lg bg-surface-elevated px-3 py-2 text-sm">Удалить</button>
        </div>

        <div className="relative overflow-hidden bg-[#111]" style={{ aspectRatio: `${props.editorWidth} / ${props.editorHeight}` }}>
          {/* Signed URL is private and short lived; the image stays below the transparent canvas. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.imageUrl} alt="Исходная фотография помещения" className="absolute inset-0 size-full object-fill" draggable={false} />
          <div className="absolute inset-0 touch-none"><canvas ref={canvasElementRef} /></div>
        </div>
      </section>

      <aside className="rounded-2xl border border-border bg-background p-5 sm:p-6">
        <p className="text-xs font-black tracking-[0.18em] text-accent uppercase">Visual Prompting</p>
        <h2 className="mt-3 text-2xl font-black italic">Покажите, что изменить</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Разметка станет визуальной подсказкой для AI. Исходное фото останется без изменений.</p>

        <div className="mt-6 grid gap-5 border-t border-border pt-5">
          <label className="grid gap-2 text-sm font-bold">Цвет
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-11 w-full cursor-pointer rounded-lg border border-border bg-surface p-1" />
          </label>
          <label className="grid gap-2 text-sm font-bold">Толщина: {width}px
            <input type="range" min="2" max="48" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="accent-[var(--accent)]" />
          </label>
        </div>

        <p className="mt-6 min-h-12 rounded-xl bg-surface-elevated p-3 text-sm leading-6 text-muted">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={clearCanvas} disabled={saving} className={buttonClassName("secondary", "rounded-xl")}>Очистить</button>
          <button type="button" onClick={() => void restoreOriginal()} disabled={saving} className={buttonClassName("secondary", "rounded-xl")}>Оригинал</button>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving} className={buttonClassName("primary", "mt-3 w-full rounded-xl disabled:opacity-50")}>
          {saving ? "Сохраняем…" : "Сохранить разметку →"}
        </button>
      </aside>
    </div>
  );
}
