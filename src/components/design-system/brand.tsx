import Link from "next/link";
import { Sparkle } from "lucide-react";
import { APP_NAME } from "@/config/brand";
import { cn } from "@/lib/cn";

export function RenoaLogo({
  href = "/app",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className,
      )}
      aria-label={
        href === "/" ? `${APP_NAME} — главная` : `${APP_NAME} — открыть холст`
      }
    >
      <Sparkle
        className="size-[18px] fill-primary text-primary"
        aria-hidden="true"
      />
      {!compact ? (
        <span className="text-[19px] font-black italic tracking-[-0.055em]">
          {APP_NAME}
        </span>
      ) : null}
    </Link>
  );
}
