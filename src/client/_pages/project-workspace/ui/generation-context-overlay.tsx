"use client";

import { SquarePen } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  editorOpen: boolean;
  composer: ReactNode;
  onToggleEditor(): void;
  onDismiss(): void;
};

export function GenerationContextOverlay({
  editorOpen,
  composer,
  onToggleEditor,
  onDismiss,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const previousEditorOpenRef = useRef(editorOpen);

  useEffect(() => {
    if (editorOpen) return;

    function dismissOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || overlayRef.current?.contains(target)) {
        return;
      }
      onDismiss();
    }

    document.addEventListener("pointerdown", dismissOnOutsidePointerDown, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        dismissOnOutsidePointerDown,
        true,
      );
  }, [editorOpen, onDismiss]);

  useEffect(() => {
    if (previousEditorOpenRef.current && !editorOpen) {
      editButtonRef.current?.focus();
    }
    previousEditorOpenRef.current = editorOpen;
  }, [editorOpen]);

  return (
    <div
      ref={overlayRef}
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
          aria-controls="generation-refinement-dialog"
          aria-haspopup="dialog"
          data-active={editorOpen || undefined}
          onClick={onToggleEditor}
        >
          <SquarePen size={16} aria-hidden="true" />
          Доработать
        </button>
      </div>
      {editorOpen ? composer : null}
    </div>
  );
}
