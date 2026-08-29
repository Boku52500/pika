import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/server/db";
import { pickTranslation } from "@/server/locale";
import {
  buildCategoryNavTree,
  selectMainNavItems,
  type CategoryNavFlat,
  type CategoryNavNode,
  type MainNavItem,
} from "@/lib/categoryNav";

export type { CategoryNavNode, MainNavItem };

export const STOREFRONT_NAV_CACHE_TAG = "storefront-nav";

const loadCategoryNavRowsCached = unstable_cache(
  async (): Promise<CategoryNavFlat[]> => {
    const categories = await prisma.category.findMany({
      include: { translations: true },
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    });

    return categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: pickTranslation(category.translations).name,
      parentId: category.parentId,
      isActive: category.isActive,
      showInMainNav: category.showInMainNav,
      navSortOrder: category.navSortOrder,
      sortOrder: category.sortOrder,
    }));
  },
  ["storefront-category-nav-rows"],
  { revalidate: 300, tags: [STOREFRONT_NAV_CACHE_TAG] },
);

async function loadCategoryNavRows(): Promise<CategoryNavFlat[]> {
  return loadCategoryNavRowsCached();
}

export const getMainNavCategories = cache(async (): Promise<MainNavItem[]> => {
  return selectMainNavItems(await loadCategoryNavRows());
});

export const getCategoryNavTree = cache(async (): Promise<CategoryNavNode[]> => {
  return buildCategoryNavTree(await loadCategoryNavRows());
});

export const getStorefrontNav = cache(async (): Promise<{ mainNav: MainNavItem[]; categoryTree: CategoryNavNode[] }> => {
  const rows = await loadCategoryNavRows();
  return {
    mainNav: selectMainNavItems(rows),
    categoryTree: buildCategoryNavTree(rows),
  };
});
