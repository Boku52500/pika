import "server-only";

/**
 * Catalogue search data-access layer.
 *
 * PostgreSQL ILIKE + in-process ranking today. The function names and DTOs
 * are the seam for later PostgreSQL FTS, pg_trgm, Meilisearch, Typesense, or
 * Algolia — swap the implementation here, keep the search UI.
 */

export { searchProducts, searchCategories, searchBrands, getSearchSuggestions } from "@/server/search/search";
export { loadStorefrontSearchPage } from "@/server/search/storefront";
export type { StorefrontSearchPage } from "@/server/search/storefront";
export type { SearchProductsOptions } from "@/server/search/search";
