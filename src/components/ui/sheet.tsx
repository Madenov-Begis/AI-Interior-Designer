"use client";

import {
  type HTMLAttributes,
  useEffect,
  useRef,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-slot="sheet"
      className="m-0 h-dvh max-h-none w-[min(21rem,88vw)] max-w-none border-0 border-r border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/70 open:flex open:flex-col"
      onClose={() => onOpenChange(false)}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
    >
      {children}
    </dialog>
  );
}

export function SheetHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-3 border-b p-4", className)} {...props} />
  );
}

export function SheetTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-semibold", className)} {...props} />;
}

export function SheetBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto p-3", className)} {...props} />;
}

export function SheetClose({
  onClose,
  className,
}: {
  onClose(): void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClose}
      className={cn("ml-auto", className)}
      aria-label="Закрыть меню"
    >
      <X className="size-4" />
    </Button>
  );
}
