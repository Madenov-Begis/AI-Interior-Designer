"use client";

import { SquarePen, Trash2 } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  editorOpen: boolean;
  composer: ReactNode;
  onToggleEditor(): void;
  onRemove(): void;
};

export function GenerationContextOverlay({
  editorOpen,
  composer,
  onToggleEditor,
  onRemove,
}: Props) {
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const previousEditorOpenRef = useRef(editorOpen);

  useEffect(() => {
    if (previousEditorOpenRef.current && !editorOpen) {
      editButtonRef.current?.focus();
    }
    previousEditorOpenRef.current = editorOpen;
  }, [editorOpen]);

  return (
    <div
      className="generation-context-overlay"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="generation-context-actions"
        aria-label="Действия с вариантом"
      >
        <button
          ref={editButtonRef}
          type="button"
          aria-expanded={editorOpen}
          aria-controls="generation-refinement-popover"
          data-active={editorOpen || undefined}
          onClick={onToggleEditor}
        >
          <SquarePen size={16} aria-hidden="true" />
          Доработать
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Убрать этот вариант с холста?")) {
              onRemove();
            }
          }}
        >
          <Trash2 size={16} aria-hidden="true" />
          Удалить
        </button>
      </div>
      {editorOpen ? composer : null}
    </div>
  );
}
