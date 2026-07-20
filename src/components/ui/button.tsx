import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-[var(--accent-hover)]",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-elevated",
  ghost: "text-foreground hover:bg-surface",
};

export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors",
    variants[variant],
    className,
  );
}
