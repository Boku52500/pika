import { cn } from "@/lib/utils";

export const adminInputClass =
  "h-10 w-full rounded-[var(--radius-sm)] border border-border-strong bg-white px-3 text-[0.875rem] text-text placeholder:text-text-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-surface-2";

export const adminTextareaClass =
  "min-h-[5.5rem] w-full rounded-[var(--radius-sm)] border border-border-strong bg-white px-3 py-2 text-[0.875rem] text-text placeholder:text-text-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

export const adminSelectClass = adminInputClass;

export const adminLabelClass = "text-[0.8125rem] font-medium text-text";

export const adminCardClass = "rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:p-5";

export function adminInputErrorClass(hasError: boolean, extra?: string) {
  return cn(
    adminInputClass,
    hasError && "border-danger-300 focus:border-danger-500 focus:ring-danger-100",
    extra,
  );
}
