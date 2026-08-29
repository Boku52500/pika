import { cn } from "@/lib/utils";

export const adminInputClass =
  "h-10 w-full rounded-[var(--radius-sm)] border border-border-strong bg-white px-3 text-[0.875rem] text-text placeholder:text-text-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-surface-2";

export const adminTextareaClass =
  "min-h-[5.5rem] w-full rounded-[var(--radius-sm)] border border-border-strong bg-white px-3 py-2 text-[0.875rem] text-text placeholder:text-text-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

export const adminSelectClass = adminInputClass;

export const adminLabelClass = "text-[0.8125rem] font-medium text-text";

export const adminCardClass = "rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:p-5";

/**
 * Space on the fields column (not the footer wrapper) so the last controls can
 * scroll above the sticky action bar instead of sitting under it.
 */
export const ADMIN_EDITOR_BOTTOM_PAD_CLASS = "pb-40 sm:pb-32";

/** Pins to the viewport bottom; only action controls receive clicks. */
export const ADMIN_STICKY_FOOTER_CLASS =
  "sticky bottom-0 z-10 -mx-4 pointer-events-none sm:-mx-0";

export const ADMIN_STICKY_FOOTER_INNER_CLASS =
  "pointer-events-none mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-3 rounded-t-[var(--radius-md)] border border-border bg-bg/95 px-4 py-3 shadow-md backdrop-blur [&>*]:pointer-events-auto sm:rounded-[var(--radius-md)]";

export const ADMIN_COMBOBOX_OPEN_STACK_CLASS = "relative z-30";

export function adminInputErrorClass(hasError: boolean, extra?: string) {
  return cn(
    adminInputClass,
    hasError && "border-danger-300 focus:border-danger-500 focus:ring-danger-100",
    extra,
  );
}
