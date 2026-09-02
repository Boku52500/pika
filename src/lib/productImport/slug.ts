import { reusableIdentityKey, reusableSlug, reusableSlugOrFallback } from "@/lib/reusableLabel";

/** Base storefront slug from product name. */
export function baseProductSlug(name: string): string {
  const slug = reusableSlug(name);
  if (slug) return slug;
  return reusableSlugOrFallback(name, "product");
}

/** Append SKU suffix for deterministic slug conflict resolution. */
export function productSlugWithSkuSuffix(base: string, sku: string): string {
  const skuPart = reusableSlug(sku) || reusableSlugOrFallback(sku, "sku");
  const suffix = `-${skuPart}`;
  const maxBaseLen = Math.max(1, 160 - suffix.length);
  const trimmedBase = base.slice(0, maxBaseLen).replace(/-+$/g, "");
  return `${trimmedBase}${suffix}`.replace(/^-+|-+$/g, "").slice(0, 160);
}

/**
 * Pick a unique product slug against reserved slugs from DB and the current import batch.
 * Prefers name-based slug; falls back to name + SKU when needed.
 */
export function resolveUniqueProductSlug(input: {
  name: string;
  sku: string;
  reservedSlugs: Set<string>;
}): string {
  const base = baseProductSlug(input.name);
  if (!input.reservedSlugs.has(base)) return base;

  const withSku = productSlugWithSkuSuffix(base, input.sku);
  if (!input.reservedSlugs.has(withSku)) return withSku;

  let index = 2;
  while (index < 10_000) {
    const candidate = productSlugWithSkuSuffix(`${base}-${index}`, input.sku);
    if (!input.reservedSlugs.has(candidate)) return candidate;
    index += 1;
  }

  return productSlugWithSkuSuffix(base, `${input.sku}-${Date.now()}`);
}

export function catalogIdentityKey(label: string): string {
  return reusableIdentityKey(label);
}

export function catalogSlug(label: string, prefix: "brand" | "category"): string {
  const slug = reusableSlug(label);
  return slug || reusableSlugOrFallback(label, prefix);
}
