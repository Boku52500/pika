import { isValidMoneyInput } from "@/server/money";
import { normalizeReusableLabel } from "@/lib/reusableLabel";

/** Trim and collapse accidental repeated spaces in product names. */
export function normalizeProductName(raw: unknown): string | null {
  if (raw == null) return null;
  const value = normalizeReusableLabel(String(raw));
  return value || null;
}

/** Normalize category/brand labels for display and identity matching. */
export function normalizeCatalogLabel(raw: unknown): string | null {
  if (raw == null) return null;
  const value = normalizeReusableLabel(String(raw));
  return value || null;
}

/**
 * Convert Excel SKU cells to stable string IDs.
 * Preserves integer SKUs without decimal formatting (176028 not 176028.0).
 */
export function normalizeSku(raw: unknown): string | null {
  if (raw == null || raw === "") return null;

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    if (Number.isInteger(raw)) return String(raw);
    const rounded = Math.round(raw);
    if (Math.abs(raw - rounded) < 1e-9) return String(rounded);
    return String(raw).trim();
  }

  let value = String(raw).trim();
  if (!value) return null;

  if (/^\d+\.0+$/.test(value)) {
    value = value.replace(/\.0+$/, "");
  }

  return value || null;
}

export type ParsedImportPrice = { ok: true; value: string } | { ok: false };

/** Parse Excel selling price into admin-compatible GEL money input. */
export function parseImportPrice(raw: unknown): ParsedImportPrice {
  if (raw == null || raw === "") return { ok: false };

  let candidate: string;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return { ok: false };
    candidate = Number.isInteger(raw) ? String(raw) : raw.toFixed(2).replace(/\.?0+$/, "") || "0";
  } else {
    candidate = String(raw).trim().replace(",", ".");
  }

  if (!isValidMoneyInput(candidate)) return { ok: false };
  const numeric = Number(candidate);
  if (!(numeric > 0)) return { ok: false };

  return { ok: true, value: candidate };
}

export function isBlankImportRow(values: {
  sku: unknown;
  name: unknown;
  category: unknown;
  brand: unknown;
  price: unknown;
}): boolean {
  return (
    normalizeSku(values.sku) == null &&
    normalizeProductName(values.name) == null &&
    normalizeCatalogLabel(values.category) == null &&
    normalizeCatalogLabel(values.brand) == null &&
    (values.price == null || values.price === "")
  );
}
