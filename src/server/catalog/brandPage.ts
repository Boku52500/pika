import "server-only";

import { cache } from "react";
import type { Product } from "@/types/product";
import { withCatalogQuery } from "@/server/catalog/errors";
import { getBrandBySlug } from "@/server/catalog/brands";
import { getProducts } from "@/server/catalog/products";
import { toStorefrontProduct } from "@/server/catalog/toStorefrontProduct";

export const loadStorefrontBrandPage = cache(async function loadStorefrontBrandPage(slug: string): Promise<{
  brand: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    indexable: boolean;
    canonicalOverride: string | null;
  };
  products: Product[];
} | null> {
  const catalogBrand = await withCatalogQuery(() => getBrandBySlug(slug));
  if (!catalogBrand) return null;

  const catalogProducts = await withCatalogQuery(() =>
    getProducts({ brandSlug: slug, active: true }),
  );

  return {
    brand: {
      id: catalogBrand.id,
      slug: catalogBrand.slug,
      name: catalogBrand.name,
      logoUrl: catalogBrand.logoUrl,
      description: catalogBrand.description,
      seoTitle: catalogBrand.seoTitle,
      seoDescription: catalogBrand.seoDescription,
      indexable: catalogBrand.indexable,
      canonicalOverride: catalogBrand.canonicalOverride,
    },
    products: catalogProducts.map(toStorefrontProduct),
  };
});
