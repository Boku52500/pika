import "server-only";

import { cache } from "react";
import { prisma } from "@/server/prisma";
import { DEFAULT_LOCALE, pickTranslation } from "@/server/locale";
import { isStorefrontVisible } from "@/server/catalog/visibility";

export const loadProductSeoMetadata = cache(async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      indexable: true,
      canonicalOverride: true,
      deletedAt: true,
      isActive: true,
      translations: { where: { locale: DEFAULT_LOCALE } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });
  if (!product || !isStorefrontVisible(product)) return null;

  const t = pickTranslation(product.translations);
  return {
    seoTitle: t.seoTitle,
    seoDescription: t.seoDescription,
    name: t.name,
    shortDescription: t.shortDescription,
    indexable: product.indexable,
    canonicalOverride: product.canonicalOverride,
    ogImage: product.images[0]?.url ?? null,
  };
});

export const loadCategorySeoMetadata = cache(async (slug: string) => {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      isActive: true,
      indexable: true,
      canonicalOverride: true,
      translations: { where: { locale: DEFAULT_LOCALE } },
    },
  });
  if (!category || !category.isActive) return null;

  const t = pickTranslation(category.translations);
  return {
    seoTitle: t.seoTitle,
    seoDescription: t.seoDescription,
    name: t.name,
    description: t.description,
    indexable: category.indexable,
    canonicalOverride: category.canonicalOverride,
  };
});
