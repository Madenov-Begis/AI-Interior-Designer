"use client";

import { Settings2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
  type RefObject,
} from "react";
import { DesignInspector, type DesignInspectorProps } from "./design-inspector";

export function useWorkspaceInspectorPanel() {
  const [dialogNode, setDialogNode] = useState<HTMLDialogElement | null>(null);
  const dialogRef = useCallback<RefCallback<HTMLDialogElement>>(
    (node) => setDialogNode(node),
    [],
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);

  const restoreTriggerFocus = useCallback(() => {
    requestAnimationFrame(() => {
      if (triggerRef.current?.offsetParent !== null) {
        triggerRef.current?.focus();
      }
    });
  }, []);

  const close = useCallback(() => {
    if (dialogNode?.open) {
      dialogNode.close();
      return;
    }
    setOpen(false);
    restoreTriggerFocus();
  }, [dialogNode, restoreTriggerFocus]);
  const show = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (dialogNode && open && !dialogNode.open) dialogNode.showModal();
  }, [dialogNode, open]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1200px)");
    const updateMode = () => {
      if (desktopQuery.matches) {
        if (dialogNode?.open) dialogNode.close();
        setOpen(false);
      }
      setDesktop(desktopQuery.matches);
    };
    updateMode();
    desktopQuery.addEventListener("change", updateMode);
    return () => desktopQuery.removeEventListener("change", updateMode);
  }, [dialogNode]);

  return {
    dialogRef,
    dialogNode,
    triggerRef,
    open,
    desktop,
    show,
    close,
    onClosed: () => {
      setOpen(false);
      restoreTriggerFocus();
    },
  };
}

export function WorkspaceInspectorTrigger({
  triggerRef,
  open,
  onOpen,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpen(): void;
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onOpen}
      className="absolute top-3 right-3 z-20 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold shadow-xl transition-colors hover:bg-secondary min-[1200px]:hidden"
      aria-label="Открыть настройки интерьера"
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <Settings2 size={18} aria-hidden="true" />
      <span className="hidden sm:inline">Новый интерьер</span>
    </button>
  );
}

export function WorkspaceInspectorPanel({
  dialogRef,
  dialogNode,
  open,
  desktop,
  onClose,
  onClosed,
  inspectorProps,
}: {
  dialogRef: RefCallback<HTMLDialogElement>;
  dialogNode: HTMLDialogElement | null;
  open: boolean;
  desktop: boolean;
  onClose(): void;
  onClosed(): void;
  inspectorProps: DesignInspectorProps;
}) {
  return (
    <dialog
      ref={dialogRef}
      open={desktop || undefined}
      aria-labelledby="design-inspector-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (!desktop && event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onClose={onClosed}
      onPointerDown={(event) => {
        if (desktop || event.target !== event.currentTarget) return;

        const bounds = event.currentTarget.getBoundingClientRect();
        const outsidePanel =
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom;
        if (outsidePanel) onClose();
      }}
      className={`fixed inset-0 z-50 m-0 h-full max-h-dvh w-full max-w-none flex-col overflow-hidden overscroll-contain border-0 bg-card p-0 pb-[env(safe-area-inset-bottom)] text-foreground shadow-2xl backdrop:bg-black/70 ${
        open ? "flex" : "hidden"
      } md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[380px] md:border-l md:border-border md:pb-0 min-[1200px]:static min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:w-[380px] min-[1200px]:shadow-none`}
    >
      <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-5 pt-[env(safe-area-inset-top)] md:pt-0">
        <div>
          <h2
            id="design-inspector-title"
            className="text-xs font-black uppercase tracking-[0.18em] text-accent"
          >
            Новый интерьер
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Стиль, формат и ваши изменения
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-11 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground min-[1200px]:hidden"
          aria-label="Закрыть настройки интерьера"
        >
          <X size={19} aria-hidden="true" />
        </button>
      </div>
      <DesignInspector
        {...inspectorProps}
        selectPortalContainer={dialogNode}
      />
    </dialog>
  );
}
