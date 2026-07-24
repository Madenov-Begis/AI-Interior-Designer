"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { CanvasViewport } from "@/components/design/canvas-viewport";
import { ReferenceManager } from "@/components/design/reference-manager";
import { WorkspaceHeader } from "@/components/design/workspace-header";
import { WorkspaceToolbar } from "@/components/design/workspace-toolbar";
import type { DesignWorkspaceProps, WorkspaceGeneration, WorkspaceGenerationStatus } from "@/components/design/workspace-types";
import type { VisualPromptEditorHandle, VisualPromptTool } from "@/features/visual-prompt/types";

type GenerationList = { items: WorkspaceGeneration[]; nextCursor: string | null };

type Model = {
  code: string;
  name: string;
  supportedAspectRatios: string[];
};

type Style = { code: string; name: string; imageUrl: string };

async function readJson(response: Response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Запрос не выполнен");
  return payload.data;
}

function isActiveGeneration(status: WorkspaceGenerationStatus) {
  return status === "QUEUED" || status === "PROCESSING";
}

export function DesignWorkspace({ project, initialReferences }: DesignWorkspaceProps) {
  const queryClient = useQueryClient();
  const visualPromptRef = useRef<VisualPromptEditorHandle | null>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const [prompt] = useState(project.prompt ?? "");
  const [modelCode] = useState("");
  const [aspectRatio] = useState(project.aspectRatio);
  const [styleCode] = useState<string>();
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<string>("source");
  const [tool, setTool] = useState<VisualPromptTool>("select");
  const [color, setColor] = useState("#afea4d");
  const [strokeWidth, setStrokeWidth] = useState(12);
  const [{ canUndo, canRedo }, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });

  const generationsQuery = useQuery({
    queryKey: ["generations", project.id],
    queryFn: async () => readJson(await fetch(`/api/v1/generations?projectId=${project.id}&limit=20`)) as Promise<GenerationList>,
    refetchInterval: (query) => query.state.data?.items.some((item) => isActiveGeneration(item.status)) ? 1500 : false,
  });
  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: async () => (await readJson(await fetch("/api/v1/models"))).models as Model[],
  });
  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: async () => (await readJson(await fetch("/api/v1/config"))).interiorStyles as Style[],
  });

  const createGeneration = useMutation({
    mutationFn: async () => {
      const selectedModelCode = modelCode || modelsQuery.data?.[0]?.code;
      if (!selectedModelCode) throw new Error("Выберите модель");
      if (prompt.trim().length < 3) throw new Error("Опишите изменения не менее чем в трёх символах");
      if (!visualPromptRef.current) throw new Error("Редактор разметки ещё не готов");
      await visualPromptRef.current.persist();
      return readJson(await fetch("/api/v1/generations", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ projectId: project.id, prompt, modelCode: selectedModelCode, aspectRatio, styleCode }),
      }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
  });
  const cancelGeneration = useMutation({
    mutationFn: async (generationId: string) => readJson(await fetch(`/api/v1/generations/${generationId}/cancel`, { method: "POST" })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
  });

  const generations = generationsQuery.data?.items ?? [];
  const selectedModel = modelCode || modelsQuery.data?.[0]?.code || "";
  const selectedStyle = configQuery.data?.find((style) => style.code === styleCode);
  const selectedGeneration = generations.find((generation) => generation.id === selectedCanvasItem);
  const generationError = createGeneration.error ?? cancelGeneration.error;
  const canvasGenerations = generations.map((generation, index) => ({
    id: generation.id,
    node: (
      <div className="grid size-full place-items-center bg-surface-elevated px-8 text-center text-muted">
        <div>
          <p className="text-sm font-black text-foreground">Результат {index + 1}</p>
          <p className="mt-2 text-xs">Карточка результата появится на следующем этапе.</p>
        </div>
      </div>
    ),
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceHeader
        projectId={project.id}
        initialName={project.name}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => void visualPromptRef.current?.undo()}
        onRedo={() => void visualPromptRef.current?.redo()}
      />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="relative min-h-0 overflow-hidden bg-background" aria-label="Холст проекта">
          <CanvasViewport
            source={{
              projectId: project.id,
              imageUrl: project.sourceUrl,
              width: project.sourceWidth,
              height: project.sourceHeight,
              initialState: project.initialCanvasState,
            }}
            generations={canvasGenerations}
            selectedItemId={selectedCanvasItem}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            editorRef={visualPromptRef}
            onHistoryStateChange={setHistoryState}
            onSelectItem={setSelectedCanvasItem}
          />
          <WorkspaceToolbar
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            canUndo={canUndo}
            canRedo={canRedo}
            onToolChange={setTool}
            onColorChange={setColor}
            onStrokeWidthChange={setStrokeWidth}
            onUndo={() => void visualPromptRef.current?.undo()}
            onRedo={() => void visualPromptRef.current?.redo()}
            onDelete={() => visualPromptRef.current?.deleteSelected()}
            onClear={() => visualPromptRef.current?.clear()}
          />
        </section>
        <aside ref={inspectorRef} className="hidden min-h-0 border-l border-border bg-surface lg:flex lg:w-[380px] lg:flex-col" aria-label="AI-настройки">
          <div className="border-b border-border px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">AI-настройки</p>
            <p className="mt-1 text-sm text-muted">Панель параметров появится здесь.</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">
            <p className="text-sm font-bold">Исходное изображение</p>
            <p className="mt-1 text-sm leading-6 text-muted">Разметка, референсы и параметры генерации останутся привязаны к этому проекту.</p>
            <ReferenceManager projectId={project.id} initialReferences={initialReferences} />
            <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm text-muted">
              Референсов: {initialReferences.length}<br />
              Генераций: {generations.length}<br />
              {selectedGeneration ? `Выбрано: ${selectedGeneration.model.name}` : "Выбрано: исходное изображение"}<br />
              {selectedModel ? `Модель: ${selectedModel}` : "Модель ещё не выбрана"}<br />
              {selectedStyle ? `Стиль: ${selectedStyle.name}` : "Стиль не выбран"}<br />
              Формат: {aspectRatio}<br />
              {prompt.trim() ? "Инструкция подготовлена" : "Инструкция ещё не задана"}
            </div>
            {(generationsQuery.isLoading || createGeneration.isPending || cancelGeneration.isPending) && <p className="mt-4 text-sm text-muted">Обновляем данные проекта…</p>}
            {generationError && <p className="mt-4 text-sm text-red-300">{generationError.message}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
