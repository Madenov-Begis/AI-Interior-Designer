import { cn } from "@/shared/lib";

const interactionStyles =
  "group border transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 active:translate-y-px [&_svg:last-child]:transition-transform [&_svg:last-child]:duration-200 hover:[&_svg:last-child]:translate-x-0.5";

export function marketingCtaClassName(className?: string) {
  return cn(
    interactionStyles,
    "border-[#d7ff91]/70 !font-bold !text-[#151812] shadow-[0_5px_0_#526f20,0_14px_36px_rgba(0,0,0,0.34)] hover:!text-[#0d100a] hover:shadow-[0_3px_0_#526f20,0_18px_44px_rgba(169,237,50,0.2)] [&_svg]:text-current",
    className,
  );
}

export function marketingDarkCtaClassName(className?: string) {
  return cn(
    interactionStyles,
    "border-white/15 shadow-[0_12px_34px_rgba(0,0,0,0.28)] hover:border-white/25 hover:shadow-[0_16px_42px_rgba(0,0,0,0.36)]",
    className,
  );
}
