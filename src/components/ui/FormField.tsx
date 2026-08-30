import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Labeled form-field wrapper shared by every form on the site (checkout,
 * login/register, profile, addresses) — associates the label and error
 * message with the control via `id`, and makes required vs. optional
 * fields visually unambiguous.
 */
export function FormField({
  id,
  label,
  required = false,
  optional = false,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex flex-col gap-0.5 text-small font-medium text-text">
        <span>
          {label}
          {required ? (
            <span aria-hidden className="text-danger-500">
              {" "}
              *
            </span>
          ) : null}
        </span>
        {optional ? (
          <span className="text-label font-normal normal-case tracking-normal text-text-faint">(არასავალდებულო)</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-label text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const base =
  "h-11 w-full rounded-[var(--radius-sm)] border px-3.5 text-[0.9375rem] text-text placeholder:text-text-faint focus:outline-none focus:ring-4 disabled:bg-surface-2 disabled:text-text-muted";
const valid = "border-border-strong focus:border-brand-500 focus:ring-brand-100";
const invalid = "border-danger-300 focus:border-danger-500 focus:ring-danger-100";

/** Shared input/select/textarea class string — pass the field's current error state to switch to the invalid (red) styling. */
export function formInputClass(hasError: boolean, extra?: string): string {
  return cn(base, hasError ? invalid : valid, extra);
}
