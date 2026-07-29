import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning";

const variants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
  success: "border-success/25 bg-success/12 text-success",
  warning: "border-warning/25 bg-warning/12 text-warning",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
