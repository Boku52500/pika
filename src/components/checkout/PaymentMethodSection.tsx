"use client";

import { CreditCard, Landmark, Banknote, ShieldCheck } from "lucide-react";
import { paymentMethods, installmentProviders, type PaymentMethodId } from "@/lib/checkout";
import { formatPrice, cn } from "@/lib/utils";

const iconByMethod: Record<PaymentMethodId, typeof CreditCard> = {
  card: CreditCard,
  installment: Landmark,
  "cash-on-delivery": Banknote,
};

/**
 * Selectable payment-method cards, plus a method-specific info panel below
 * the grid — a safe "you'll pay securely after confirming" note for card
 * payments (no real card details are ever collected here), an installment
 * bank/term picker (UI only — structured for real providers later), and a
 * cash-on-delivery reminder.
 */
export function PaymentMethodSection({
  value,
  onChange,
  installmentMonths,
  onInstallmentMonthsChange,
  total,
  error,
}: {
  value: PaymentMethodId | null;
  onChange: (value: PaymentMethodId) => void;
  installmentMonths: number | null;
  onInstallmentMonthsChange: (months: number) => void;
  total: number;
  error?: string;
}) {
  return (
    <section
      id="paymentMethod"
      aria-labelledby="payment-method-heading"
      className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-5 sm:p-6"
    >
      <h2 id="payment-method-heading" className="text-h3 text-text">
        გადახდის მეთოდი
      </h2>

      <div role="radiogroup" aria-label="გადახდის მეთოდი" aria-required aria-invalid={Boolean(error)} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {paymentMethods.map((method) => {
          const Icon = iconByMethod[method.id];
          const selected = value === method.id;

          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(method.id)}
              className={cn(
                "flex flex-col gap-2 rounded-[var(--radius-md)] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                selected ? "border-brand-600 bg-brand-50" : "border-border-strong hover:border-ink-900"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <Icon className="size-5 text-brand-600" strokeWidth={1.75} />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                    selected ? "border-brand-600 bg-brand-600" : "border-border-strong"
                  )}
                >
                  {selected ? <span className="size-1.5 rounded-full bg-white" /> : null}
                </span>
              </div>
              <span className="text-small font-semibold text-text">{method.label}</span>
              <span className="text-label text-text-muted">{method.description}</span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-label text-danger-500">
          {error}
        </p>
      ) : null}

      {value === "card" ? (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface-2 p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-600" strokeWidth={1.75} />
          <p className="text-small text-text-muted">
            შეკვეთის დადასტურების შემდეგ გადახვალთ საქართველოს ბანკის უსაფრთხო გადახდის გვერდზე — ბარათის
            მონაცემები ამ საიტზე არ ინახება და არ გროვდება.
          </p>
        </div>
      ) : null}

      {value === "cash-on-delivery" ? (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface-2 p-4">
          <Banknote className="mt-0.5 size-4 shrink-0 text-brand-600" strokeWidth={1.75} />
          <p className="text-small text-text-muted">მზად გქონდეთ ზუსტი თანხა კურიერთან მიღებისას.</p>
        </div>
      ) : null}

      {value === "installment" ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-surface-2 p-4">
          <p className="text-small font-medium text-text">აირჩიეთ ბანკი და ვადა</p>
          <div className="flex flex-wrap gap-2">
            {installmentProviders.map((provider) =>
              provider.months.map((months) => {
                const selected = installmentMonths === months;
                return (
                  <button
                    key={`${provider.id}-${months}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onInstallmentMonthsChange(months)}
                    className={cn(
                      "text-small rounded-[var(--radius-sm)] border px-3.5 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                      selected ? "border-brand-600 bg-brand-50 text-brand-700" : "border-border-strong bg-surface text-text hover:border-ink-900"
                    )}
                  >
                    {provider.name} · {months} თვე
                  </button>
                );
              })
            )}
          </div>
          {installmentMonths ? (
            <p className="text-small tnum text-text-muted">
              სავარაუდო გადასახდელი — <span className="font-semibold text-text">{formatPrice(total / installmentMonths)}</span>
              /თვეში
            </p>
          ) : null}
          <p className="text-label text-text-faint">
            საბოლოო პირობებსა და საკომისიოს დაადასტურებთ ბანკთან შემდეგ ეტაპზე.
          </p>
        </div>
      ) : null}
    </section>
  );
}
