import { formatPrice, getDiscountPercent, cn } from "@/lib/utils";
import type { ProductInstallment } from "@/types/product";

/**
 * Price block used on every product card / listing. Hierarchy is
 * deliberate: current price is the dominant element, the previous price is
 * a small secondary strike-through, and the discount is a quiet inline
 * label rather than a second loud badge (the corner badge already covers
 * "at a glance" scanning).
 */
export function ProductPrice({
  price,
  previousPrice,
  installment,
  installmentOptions,
  size = "md",
  className,
}: {
  price: number;
  previousPrice?: number;
  installment?: ProductInstallment;
  /**
   * When provided (PDP context), renders every financing term as a compact
   * chip instead of the single "თვეში X-დან" line. Falls back to `installment`
   * when omitted, so every existing card/list usage is unaffected.
   */
  installmentOptions?: ProductInstallment[];
  size?: "md" | "lg";
  className?: string;
}) {
  const discount = getDiscountPercent(price, previousPrice);
  const options = installmentOptions?.length ? installmentOptions : installment ? [installment] : [];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn("text-price text-text", size === "lg" ? "text-3xl sm:text-[2.25rem]" : "text-lg")}>
          {formatPrice(price)}
        </span>
        {previousPrice && discount ? (
          <span className={cn("tnum text-text-faint line-through", size === "lg" ? "text-body" : "text-small")}>
            {formatPrice(previousPrice)}
          </span>
        ) : null}
        {discount ? (
          <span
            className={cn(
              "tnum text-danger-500",
              size === "lg" ? "text-label rounded-[var(--radius-xs)] bg-danger-50 px-1.5 py-0.5" : "text-label"
            )}
          >
            -{discount}%
          </span>
        ) : null}
      </div>

      {installmentOptions?.length ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {options.map((option) => (
            <span
              key={option.months}
              className="text-label tnum inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-border bg-surface-2 px-2 py-1 font-medium normal-case tracking-normal text-text-muted"
            >
              {option.months} თვე — <span className="font-semibold text-text">{formatPrice(option.monthlyPrice)}</span>
            </span>
          ))}
        </div>
      ) : installment ? (
        <p className="text-small tnum text-text-muted">
          თვეში <span className="font-semibold text-text">{formatPrice(installment.monthlyPrice)}</span>-დან
        </p>
      ) : null}
    </div>
  );
}
