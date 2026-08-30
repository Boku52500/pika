import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "@/server/db";
import { pickTranslation } from "@/server/locale";
import { storefrontProductWhere } from "@/server/catalog/visibility";
import {
  STOREFRONT_BRANDS_CACHE_TAG,
  STOREFRONT_HOMEPAGE_CATEGORIES_CACHE_TAG,
} from "@/server/catalog/merchTags";
import { selectHomepageCategories } from "@/lib/homepageCategories";

export type HomepageBrandSlide = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  href: string;
};

export type HomepageCategoryCard = {
  id: string;
  slug: string;
  name: string;
  href: string;
  imageUrl: string | null;
  iconKey: string | null;
  productCount: number;
};

const HOMEPAGE_BRAND_FALLBACK_LIMIT = 12;

const loadHomepageBrands = unstable_cache(
  async (): Promise<HomepageBrandSlide[]> => {
    const configured = await prisma.brand.findMany({
      where: { showOnHomepage: true },
      include: { translations: true },
      orderBy: [{ homepageSortOrder: "asc" }, { sortOrder: "asc" }, { slug: "asc" }],
    });

    const rows =
      configured.length > 0
        ? configured
        : await prisma.brand.findMany({
            include: { translations: true },
            orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
            take: HOMEPAGE_BRAND_FALLBACK_LIMIT,
          });

    return rows.map((brand) => ({
      id: brand.id,
      slug: brand.slug,
      name: pickTranslation(brand.translations).name,
      logoUrl: brand.logoUrl,
      href: `/brand/${brand.slug}`,
    }));
  },
  ["storefront-homepage-brands"],
  { revalidate: 300, tags: [STOREFRONT_BRANDS_CACHE_TAG] },
);

async function countProductsForCategoryTree(rootId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE tree AS (
      SELECT id FROM "Category" WHERE id = ${rootId}
      UNION ALL
      SELECT c.id FROM "Category" c INNER JOIN tree t ON c."parentId" = t.id
    )
    SELECT id FROM tree
  `;
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return 0;
  return prisma.product.count({
    where: storefrontProductWhere({ categoryId: { in: ids } }),
  });
}

const loadHomepageCategories = unstable_cache(
  async (): Promise<HomepageCategoryCard[]> => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { translations: true },
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    });

    const selected = selectHomepageCategories(
      categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: pickTranslation(category.translations).name,
        parentId: category.parentId,
        isActive: category.isActive,
        showOnHomepage: category.showOnHomepage,
        homepageSortOrder: category.homepageSortOrder,
        sortOrder: category.sortOrder,
        imageUrl: category.imageUrl,
        iconKey: category.iconKey,
      })),
    );

    const cards = await Promise.all(
      selected.map(async (category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        href: `/category/${category.slug}`,
        imageUrl: category.imageUrl,
        iconKey: category.iconKey,
        productCount: await countProductsForCategoryTree(category.id),
      })),
    );

    return cards;
  },
  ["storefront-homepage-categories"],
  { revalidate: 300, tags: [STOREFRONT_HOMEPAGE_CATEGORIES_CACHE_TAG] },
);

export const getHomepageBrandSlides = cache(() => loadHomepageBrands());
export const getHomepageCategoryCards = cache(() => loadHomepageCategories());
