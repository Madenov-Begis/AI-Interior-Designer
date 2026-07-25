"use client";

import { SourceUpload } from "@/components/design/source-upload";
import { WorkspaceHeader } from "@/components/design/workspace-header";

type EmptySourceWorkspaceProps = {
  projectId: string;
  projectName: string;
};

export function EmptySourceWorkspace({
  projectId,
  projectName,
}: EmptySourceWorkspaceProps) {
  return (
    <div className="canvas-workspace flex h-full min-h-0 flex-col">
      <WorkspaceHeader
        projectId={projectId}
        initialName={projectName}
        canUndo={false}
        canRedo={false}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />
      <div className="grid min-h-0 flex-1 min-[1200px]:grid-cols-[minmax(0,1fr)_380px]">
        <section
          className="page-grid grid min-h-0 place-items-center overflow-auto bg-background p-4 sm:p-8"
          aria-label="Загрузка фотографии помещения"
        >
          <SourceUpload
            projectId={projectId}
            initialProjectName={projectName}
          />
        </section>
        <aside className="hidden border-l border-border bg-surface p-6 min-[1200px]:block">
          <p className="text-xs font-black tracking-[0.18em] text-accent uppercase">
            AI-настройки
          </p>
          <h2 className="mt-3 text-2xl font-black italic">
            Начните с фотографии
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            После загрузки здесь появятся референсы, инструкция, стиль, модель
            и кнопка генерации.
          </p>
          <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm text-muted">
            Сначала загрузите фотографию помещения.
          </div>
        </aside>
      </div>
    </div>
  );
}
