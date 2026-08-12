import * as React from "react";

import { cn } from "@/shared/lib";

function LoadingRegion({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export { LoadingRegion };
