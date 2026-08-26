"use client";

import type { CustomerInfo } from "@/lib/checkout";
import { formatGeorgianPhoneInput } from "@/lib/checkoutValidation";
import { cn } from "@/lib/utils";
import { FormField, formInputClass } from "@/components/ui/FormField";

/** საკონტაქტო ინფორმაცია — no account required, guest checkout by default. */
export function CustomerInfoSection({
  customer,
  errors,
  onChange,
  onBlur,
}: {
  customer: CustomerInfo;
  errors: Partial<Record<keyof CustomerInfo, string>>;
  onChange: (field: keyof CustomerInfo, value: string) => void;
  onBlur: (field: keyof CustomerInfo) => void;
}) {
  return (
    <section aria-labelledby="customer-info-heading" className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-border bg-surface p-5 sm:p-6">
      <h2 id="customer-info-heading" className="text-h3 text-text">
        საკონტაქტო ინფორმაცია
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="firstName" label="სახელი" required error={errors.firstName}>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            value={customer.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            onBlur={() => onBlur("firstName")}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
            className={formInputClass(Boolean(errors.firstName))}
          />
        </FormField>

        <FormField id="lastName" label="გვარი" required error={errors.lastName}>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            value={customer.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            onBlur={() => onBlur("lastName")}
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
            className={formInputClass(Boolean(errors.lastName))}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="phone" label="ტელეფონის ნომერი" required error={errors.phone}>
          <div
            className={cn(
              "flex items-stretch overflow-hidden rounded-[var(--radius-sm)] border bg-surface focus-within:ring-4",
              errors.phone ? "border-danger-300 focus-within:border-danger-500 focus-within:ring-danger-100" : "border-border-strong focus-within:border-brand-500 focus-within:ring-brand-100"
            )}
          >
            <span className="flex shrink-0 items-center border-r border-border bg-surface-2 px-3 text-[0.9375rem] font-medium text-text-muted">
              +995
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="5XX XX XX XX"
              value={customer.phone}
              onChange={(e) => onChange("phone", formatGeorgianPhoneInput(e.target.value))}
              onBlur={() => onBlur("phone")}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              className="h-11 w-full min-w-0 border-0 bg-transparent px-3 text-[0.9375rem] text-text placeholder:text-text-faint focus:outline-none focus:ring-0"
            />
          </div>
        </FormField>

        <FormField id="email" label="ელ. ფოსტა" required error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="example@mail.com"
            value={customer.email}
            onChange={(e) => onChange("email", e.target.value)}
            onBlur={() => onBlur("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={formInputClass(Boolean(errors.email))}
          />
        </FormField>
      </div>
    </section>
  );
}
