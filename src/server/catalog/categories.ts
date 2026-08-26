import { prisma } from "@/server/prisma";
import { mapCategory } from "@/server/catalog/mappers";
import { categoryInclude } from "@/server/catalog/include";
import type { CatalogCategory } from "@/server/catalog/types";
import { DEFAULT_LOCALE, resolveLocale } from "@/server/locale";

export async function getCategories(locale = DEFAULT_LOCALE): Promise<CatalogCategory[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    include: categoryInclude,
    orderBy: { sortOrder: "asc" },
  });
  return categories.map((category) => mapCategory(category, resolveLocale(locale)));
}

export async function getCategoryBySlug(
  slug: string,
  locale = DEFAULT_LOCALE,
): Promise<CatalogCategory | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      ...categoryInclude,
      parent: { include: { translations: true } },
    },
  });
  if (!category) return null;
  return mapCategory(category, resolveLocale(locale));
}
