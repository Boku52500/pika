import "server-only";

import { cache } from "react";
import type { Category, Product } from "@/types/product";
import { sanitizeSearchQuery } from "@/lib/search";
import { withCatalogQuery } from "@/server/catalog/errors";
import { getCategories } from "@/server/catalog/categories";
import { toStorefrontCategory } from "@/server/catalog/toStorefrontProduct";
import { searchProducts } from "@/server/search/search";

export type StorefrontSearchPage = {
  query: string;
  products: Product[];
  browseCategories: Category[];
};

async function loadBrowseCategories(): Promise<Category[]> {
  const categories = await getCategories();
  return categories.map((category) => toStorefrontCategory(category, 0));
}

export const loadStorefrontSearchPage = cache(async function loadStorefrontSearchPage(
  rawQuery: string,
): Promise<StorefrontSearchPage> {
  const query = sanitizeSearchQuery(rawQuery);

  const [products, browseCategories] = await Promise.all([
    withCatalogQuery(() => searchProducts(query)),
    withCatalogQuery(loadBrowseCategories),
  ]);

  return { query, products, browseCategories };
});
