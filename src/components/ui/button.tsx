import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "destructive";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-black/15",
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-black/15",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "text-foreground hover:bg-accent-surface",
  outline:
    "border border-input bg-background hover:bg-accent-surface",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-12 rounded-xl px-6 text-base",
  icon: "size-10 shrink-0",
};

export function buttonClassName(
  variant: ButtonVariant = "default",
  className?: string,
  size: ButtonSize = "default",
) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, className, size)}
      {...props}
    />
  );
}
