import * as React from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "on-ink" | "on-surface";
  "aria-label": string;
}

const variantClasses: Record<NonNullable<IconButtonProps["variant"]>, string> = {
  default: "text-ink-900 hover:bg-black/[0.05] active:bg-black/[0.08]",
  "on-ink": "text-text-on-ink hover:bg-white/10 active:bg-white/15",
  "on-surface": "text-ink-700 bg-white/90 hover:bg-white shadow-sm",
};

export function IconButton({
  variant = "default",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
