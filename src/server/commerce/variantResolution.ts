/**
 * Resolve which product variant an order line should use.
 * Manual availability only — numeric stock is ignored.
 *
 * When the cart omits variant axes (e.g. add-from-PLP with empty list variants),
 * fall back to the first active variant instead of treating the line as unavailable.
 */
export type SelectedVariantAxis = { attributeSlug: string; optionSlug: string };

export type ResolvableVariant = {
  id: string;
  options: Array<{
    option: { slug: string; attribute: { slug: string } };
  }>;
};

export function variantMatchesSelection(
  variant: ResolvableVariant,
  selected: SelectedVariantAxis[],
): boolean {
  if (selected.length === 0 || variant.options.length === 0) return false;
  return variant.options.every((entry) =>
    selected.some(
      (sel) => entry.option.attribute.slug === sel.attributeSlug && entry.option.slug === sel.optionSlug,
    ),
  );
}

export function resolveOrderVariant<T extends ResolvableVariant>(
  variants: T[],
  selected: SelectedVariantAxis[],
): T | null {
  if (variants.length === 0) return null;

  const exact = variants.find((variant) => variantMatchesSelection(variant, selected));
  if (exact) return exact;

  if (selected.length === 0) return variants[0] ?? null;

  return null;
}

/** Manual availability for purchase/financing — stock quantity is irrelevant. */
export function isManuallyPurchasable(input: {
  productActive: boolean;
  productDeleted: boolean;
  variantActive: boolean | null;
}): boolean {
  if (input.productDeleted || !input.productActive) return false;
  if (input.variantActive === false) return false;
  return true;
}
