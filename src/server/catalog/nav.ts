import "server-only";

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

async function loadCategoryNavRows(): Promise<CategoryNavFlat[]> {
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
}

export async function getMainNavCategories(): Promise<MainNavItem[]> {
  return selectMainNavItems(await loadCategoryNavRows());
}

export async function getCategoryNavTree(): Promise<CategoryNavNode[]> {
  return buildCategoryNavTree(await loadCategoryNavRows());
}

export async function getStorefrontNav(): Promise<{ mainNav: MainNavItem[]; categoryTree: CategoryNavNode[] }> {
  const rows = await loadCategoryNavRows();
  return {
    mainNav: selectMainNavItems(rows),
    categoryTree: buildCategoryNavTree(rows),
  };
}
