import * as React from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/shared/lib";
import { Button } from "./button";

type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  pending?: boolean;
  pendingText?: React.ReactNode;
};

function LoadingButton({
  pending = false,
  pendingText = "Загружаем…",
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      data-pending={pending ? "" : undefined}
      {...props}
    >
      <span className="grid items-center justify-items-center">
        <span
          className={cn(
            "col-start-1 row-start-1 inline-flex items-center gap-2",
            pending && "invisible",
          )}
          aria-hidden={pending || undefined}
        >
          {children}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 inline-flex items-center gap-2",
            !pending && "invisible",
          )}
          aria-hidden={!pending || undefined}
        >
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {pendingText}
        </span>
      </span>
    </Button>
  );
}

export { LoadingButton };
