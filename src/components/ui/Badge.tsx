import { cn } from "@/lib/utils";

type Tone = "accent" | "success" | "danger" | "ink" | "neutral" | "brand";

const toneClasses: Record<Tone, string> = {
  accent: "bg-accent-500 text-white",
  success: "bg-success-50 text-success-600",
  danger: "bg-danger-500 text-white",
  ink: "bg-ink-900 text-white",
  neutral: "bg-surface-2 text-text-muted border border-border",
  brand: "bg-brand-50 text-brand-700",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-label inline-flex items-center gap-1 rounded-[var(--radius-xs)] px-1.5 py-0.5 tracking-[0.04em]",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
