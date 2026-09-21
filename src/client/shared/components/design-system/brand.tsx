import Link from "next/link";
import { APP_NAME } from "@/shared/config";
import { cn } from "@/shared/lib";

export function RuvieWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("text-[19px] font-black tracking-[-0.055em]", className)}
    >
      {APP_NAME}
    </span>
  );
}

export function RuvieLogo({
  href = "/app",
  className,
  ariaLabel,
}: {
  href?: string;
  className?: string;
  ariaLabel?: string;
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
        ariaLabel ?? APP_NAME
      }
    >
      <RuvieWordmark />
    </Link>
  );
}
