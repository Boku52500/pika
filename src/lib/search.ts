import type { Category, Product } from "@/types/product";

/**
 * Shared search contracts used by the header autocomplete and `/search`.
 *
 * Ranking and catalogue matching live in `src/server/search`. This module is
 * client-safe: constants, DTO shapes, and query sanitization only. Do not
 * import `src/data` here — PostgreSQL is the catalogue source of truth.
 *
 * Later swaps (pg_trgm / PostgreSQL FTS / Meilisearch / Typesense / Algolia)
 * should keep these types stable so the search UI does not need a rebuild.
 */

export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 80;

export const SEARCH_SUGGESTION_LIMITS = {
  products: 5,
  categories: 3,
  brands: 3,
} as const;

/** Upper bound for the full `/search` result set before client-side filter/sort. */
export const SEARCH_PAGE_LIMIT = 80;

export interface SearchSuggestions {
  products: Product[];
  /** Total number of matching products, before slicing down to `products` for display. */
  productsTotal: number;
  categories: Category[];
  brands: string[];
}

export const emptySearchSuggestions: SearchSuggestions = {
  products: [],
  productsTotal: 0,
  categories: [],
  brands: [],
};

/** Trim, collapse whitespace, and cap length. Empty/whitespace-only input becomes `""`. */
export function sanitizeSearchQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_QUERY_LENGTH);
}
