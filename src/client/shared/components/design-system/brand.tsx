import Link from "next/link";
import { APP_NAME } from "@/shared/config";
import { cn } from "@/shared/lib";

export function RoovaLogo({
  href = "/app",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className,
      )}
      aria-label={
        href === "/" ? `${APP_NAME} — главная` : `${APP_NAME} — открыть холст`
      }
    >
      <span className="text-[19px] font-black italic tracking-[-0.055em]">
        {APP_NAME}
      </span>
    </Link>
  );
}
