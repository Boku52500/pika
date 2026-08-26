/**
 * In-process ranking for catalogue search candidates.
 *
 * PostgreSQL only narrows the candidate set (ILIKE contains). This module
 * decides which rows are real matches and in what order — including the
 * Georgian noun-number heuristic and the short-token noise guard.
 *
 * Keep this independent of Prisma so a later FTS / pg_trgm / Meilisearch
 * backend can reuse the same relevance policy, or replace it behind the
 * same `searchProducts` / `getSearchSuggestions` functions.
 */

export type SearchableProduct = {
  name: string;
  brand: string;
  sku: string;
  slug: string;
  categoryName: string;
  storage?: string | null;
  ram?: string | null;
  highlights?: readonly string[] | null;
  reviewCount: number;
};

export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

/** Splits on anything that isn't a Latin/Georgian letter or digit. */
export function tokenizeSearchText(value: string): string[] {
  return normalizeSearchText(value)
    .split(/[^a-zა-ჰ0-9]+/i)
    .filter(Boolean);
}

function longestCommonPrefixLength(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[i] === b[i]) i++;
  return i;
}

/**
 * Loose term match tuned for Georgian noun number variance — e.g. the query
 * "ტელეფონი" (phone, singular) should still surface the "ტელეფონები"
 * (phones) category. Falls back to a prefix/overlap heuristic so this stays
 * useful without a full morphological stemmer.
 *
 * Tokens shorter than 3 characters never match this way: a lone "x" or "z"
 * from "TKL" / "Galaxy Z" would otherwise hit nearly every query that happens
 * to contain that letter.
 */
export function termsRelated(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  if (shorter < 3) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const lcp = longestCommonPrefixLength(a, b);
  return lcp >= 4 && lcp / shorter >= 0.72;
}

/**
 * ILIKE needles for candidate retrieval.
 *
 * Includes the full query, tokens of length ≥ 3, and a Georgian stem prefix
 * so "ტელეფონი" can find "ტელეფონები" in SQL before JS ranking runs.
 * One-character tokens are never emitted.
 */
export function searchNeedles(query: string): string[] {
  const q = normalizeSearchText(query);
  if (q.length < 2) return [];

  const needles = new Set<string>();
  needles.add(q);

  for (const token of tokenizeSearchText(q)) {
    if (token.length >= 3) needles.add(token);
    if (/[ა-ჰ]/.test(token) && token.length >= 4) {
      const prefixLen = Math.max(4, Math.ceil(token.length * 0.72));
      needles.add(token.slice(0, prefixLen));
    }
  }

  return [...needles].filter((needle) => needle.length >= 2).slice(0, 6);
}

export function scoreProduct(product: SearchableProduct, query: string): number {
  const name = normalizeSearchText(product.name);
  const brand = normalizeSearchText(product.brand);
  const sku = normalizeSearchText(product.sku);
  const slug = normalizeSearchText(product.slug).replace(/-/g, " ");
  const category = normalizeSearchText(product.categoryName);
  let score = 0;

  if (sku === query || slug === query) score += 120;
  else if ((sku && sku.startsWith(query)) || (slug && slug.startsWith(query))) score += 70;
  else if ((sku && sku.includes(query)) || (slug && slug.includes(query))) score += 35;

  if (name === query) score += 100;
  else if (name.startsWith(query)) score += 80;
  else if (name.includes(query)) score += 60;

  if (brand === query) score += 50;
  else if (brand.startsWith(query)) score += 40;
  else if (brand.includes(query)) score += 25;
  else if (query.includes(brand) && brand.length > 2) score += 20;

  if (category && (category.includes(query) || query.includes(category))) score += 25;

  if (product.storage && normalizeSearchText(product.storage).includes(query)) score += 15;
  if (product.ram && normalizeSearchText(product.ram).includes(query)) score += 15;

  if (score === 0) {
    const queryTokens = tokenizeSearchText(query);
    const productTokens = tokenizeSearchText(
      [product.name, product.brand, category, ...(product.highlights ?? [])].join(" "),
    );
    if (queryTokens.length && productTokens.length) {
      let matched = 0;
      for (const qt of queryTokens) {
        if (productTokens.some((pt) => termsRelated(pt, qt))) matched++;
      }
      if (matched > 0) score += Math.round((matched / queryTokens.length) * 40);
    }
  }

  return score;
}

export function scoreCategoryName(name: string, query: string): number {
  const normalized = normalizeSearchText(name);
  if (normalized === query) return 100;
  if (normalized.startsWith(query)) return 80;
  if (normalized.includes(query) || query.includes(normalized)) return 60;
  if (termsRelated(normalized, query)) return 40;
  return 0;
}

export function scoreBrandName(name: string, query: string): number {
  const normalized = normalizeSearchText(name);
  if (normalized === query) return 100;
  if (normalized.startsWith(query)) return 80;
  if (normalized.includes(query)) return 50;
  return 0;
}
