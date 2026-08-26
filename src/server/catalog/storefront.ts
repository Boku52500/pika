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

const cachedProductBySlug = cache((slug: string) => withCatalogQuery(() => getProductBySlug(slug)));
const cachedCategoryBySlug = cache((slug: string) => withCatalogQuery(() => getCategoryBySlug(slug)));

export function getStorefrontProductBySlug(slug: string): Promise<CatalogProduct | null> {
  return cachedProductBySlug(slug);
}

export async function getHomepageFeaturedProducts(): Promise<Product[]> {
  const products = await withCatalogQuery(() => getProducts({ featured: true, active: true }));
  return products.map(toStorefrontProduct);
}

export async function getHomepageNewArrivals(): Promise<Product[]> {
  const products = await withCatalogQuery(() => getProducts({ newArrivals: true, active: true }));
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
  const catalogProduct = await cachedProductBySlug(slug);
  if (!catalogProduct) return null;

  const relatedCatalog = await withCatalogQuery(() => getRelatedProducts(catalogProduct.id));
  const youMightLikeCatalog = await withCatalogQuery(() =>
    getRecommendedProducts(
      catalogProduct.id,
      relatedCatalog.map((item) => item.id),
    ),
  );

  return {
    product: toStorefrontProduct(catalogProduct),
    related: relatedCatalog.map(toStorefrontProduct),
    youMightLike: youMightLikeCatalog.map(toStorefrontProduct),
    categoryName: catalogProduct.category.name,
    categoryHref: `/category/${catalogProduct.category.slug}`,
    seoTitle: catalogProduct.seo.title,
    seoDescription: catalogProduct.seo.description,
    indexable: catalogProduct.seo.indexable,
    canonicalOverride: catalogProduct.seo.canonicalOverride,
  };
});
