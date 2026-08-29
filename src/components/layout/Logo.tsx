import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Pika — მთავარი გვერდი"
      className={cn("group inline-flex shrink-0 items-center gap-2", className)}
    >
      <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-brand-600 text-white transition-colors group-hover:bg-brand-700">
        <Zap className="size-[18px] fill-white text-white" strokeWidth={0} />
      </span>
      <span
        className={cn(
          "text-xl font-extrabold tracking-[-0.03em]",
          dark ? "text-white" : "text-ink-900"
        )}
      >
        Pika
      </span>
    </Link>
  );
}
