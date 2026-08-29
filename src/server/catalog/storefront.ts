import "server-only";

import { cache } from "react";
import type { Category, Product } from "@/types/product";
import { withCatalogQuery } from "@/server/catalog/errors";
import { getCategoryBySlug } from "@/server/catalog/categories";
import {
  getProductBySlug,
  getProducts,
  getProductsByCategory,
  getRecommendedProducts,
  getRelatedProducts,
} from "@/server/catalog/products";
import { toStorefrontCategory, toStorefrontProduct } from "@/server/catalog/toStorefrontProduct";
import type { CatalogProduct } from "@/server/catalog/types";

const HOMEPAGE_SECTION_LIMIT = 12;

const cachedProductBySlug = cache((slug: string) => withCatalogQuery(() => getProductBySlug(slug)));
const cachedCategoryBySlug = cache((slug: string) => withCatalogQuery(() => getCategoryBySlug(slug)));

export function getStorefrontProductBySlug(slug: string): Promise<CatalogProduct | null> {
  return cachedProductBySlug(slug);
}

export async function getHomepageFeaturedProducts(): Promise<Product[]> {
  const products = await withCatalogQuery(() =>
    getProducts({ featured: true, active: true, take: HOMEPAGE_SECTION_LIMIT }),
  );
  return products.map(toStorefrontProduct);
}

export async function getHomepageNewArrivals(): Promise<Product[]> {
  const products = await withCatalogQuery(() =>
    getProducts({ newArrivals: true, active: true, take: HOMEPAGE_SECTION_LIMIT }),
  );
  return products.map(toStorefrontProduct);
}

export const loadStorefrontCategoryPage = cache(async function loadStorefrontCategoryPage(slug: string): Promise<{
  category: Category;
  products: Product[];
  seoTitle: string | null;
  seoDescription: string | null;
  indexable: boolean;
  canonicalOverride: string | null;
} | null> {
  const [catalogCategory, catalogProducts] = await Promise.all([
    cachedCategoryBySlug(slug),
    withCatalogQuery(() => getProductsByCategory(slug)),
  ]);

  if (!catalogCategory || !catalogCategory.isActive) return null;

  const products = catalogProducts.map(toStorefrontProduct);
  return {
    category: toStorefrontCategory(catalogCategory, products.length),
    products,
    seoTitle: catalogCategory.seoTitle,
    seoDescription: catalogCategory.seoDescription,
    indexable: catalogCategory.indexable,
    canonicalOverride: catalogCategory.canonicalOverride,
  };
});

export const loadStorefrontProductCore = cache(async function loadStorefrontProductCore(slug: string): Promise<{
  product: Product;
  categoryName: string;
  categoryHref: string;
  seoTitle: string | null;
  seoDescription: string | null;
  indexable: boolean;
  canonicalOverride: string | null;
  productId: string;
  categoryId: string;
} | null> {
  const catalogProduct = await cachedProductBySlug(slug);
  if (!catalogProduct) return null;

  return {
    product: toStorefrontProduct(catalogProduct),
    categoryName: catalogProduct.category.name,
    categoryHref: `/category/${catalogProduct.category.slug}`,
    seoTitle: catalogProduct.seo.title,
    seoDescription: catalogProduct.seo.description,
    indexable: catalogProduct.seo.indexable,
    canonicalOverride: catalogProduct.seo.canonicalOverride,
    productId: catalogProduct.id,
    categoryId: catalogProduct.category.id,
  };
});

export const loadStorefrontProductRecommendations = cache(async function loadStorefrontProductRecommendations(
  slug: string,
): Promise<{ related: Product[]; youMightLike: Product[] } | null> {
  const catalogProduct = await cachedProductBySlug(slug);
  if (!catalogProduct) return null;

  const known = { productId: catalogProduct.id, categoryId: catalogProduct.category.id };
  const relatedCatalog = await withCatalogQuery(() =>
    getRelatedProducts(catalogProduct.id, 8, undefined, known),
  );
  const youMightLikeCatalog = await withCatalogQuery(() =>
    getRecommendedProducts(
      catalogProduct.id,
      relatedCatalog.map((item) => item.id),
      8,
      undefined,
      catalogProduct.id,
    ),
  );

  return {
    related: relatedCatalog.map(toStorefrontProduct),
    youMightLike: youMightLikeCatalog.map(toStorefrontProduct),
  };
});

/** @deprecated Prefer loadStorefrontProductCore + loadStorefrontProductRecommendations */
export const loadStorefrontProductPage = cache(async function loadStorefrontProductPage(slug: string): Promise<{
  product: Product;
  related: Product[];
  youMightLike: Product[];
  categoryName: string;
  categoryHref: string;
  seoTitle: string | null;
  seoDescription: string | null;
  indexable: boolean;
  canonicalOverride: string | null;
} | null> {
  const core = await loadStorefrontProductCore(slug);
  if (!core) return null;
  const recs = await loadStorefrontProductRecommendations(slug);
  return {
    product: core.product,
    related: recs?.related ?? [],
    youMightLike: recs?.youMightLike ?? [],
    categoryName: core.categoryName,
    categoryHref: core.categoryHref,
    seoTitle: core.seoTitle,
    seoDescription: core.seoDescription,
    indexable: core.indexable,
    canonicalOverride: core.canonicalOverride,
  };
});
