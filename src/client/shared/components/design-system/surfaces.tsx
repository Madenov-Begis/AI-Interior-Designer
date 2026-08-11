import type { HTMLAttributes, ReactNode } from "react";
import { Card } from "../ui/card";
import { cn } from "@/shared/lib";

export function RuviePage({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("ruvie-grid min-h-full bg-background", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function RuviePanel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <Card className={className} {...props}>
      {children}
    </Card>
  );
}

export function RuvieSectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-black italic tracking-[-0.045em] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function RuvieStepLabel({
  step,
  children,
  className,
}: {
  step: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="text-sm font-bold">{children}</span>
      <span className="font-mono text-sm font-black italic text-muted-foreground">
        {step}
      </span>
    </div>
  );
}
