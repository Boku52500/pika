import { prisma } from "@/server/prisma";
import { mapBrand } from "@/server/catalog/mappers";
import { brandInclude } from "@/server/catalog/include";
import type { CatalogBrand } from "@/server/catalog/types";
import { DEFAULT_LOCALE, resolveLocale } from "@/server/locale";

export async function getBrands(locale = DEFAULT_LOCALE): Promise<CatalogBrand[]> {
  const brands = await prisma.brand.findMany({
    include: brandInclude,
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });
  return brands.map((brand) => mapBrand(brand, resolveLocale(locale)));
}

export async function getBrandBySlug(
  slug: string,
  locale = DEFAULT_LOCALE,
): Promise<CatalogBrand | null> {
  const brand = await prisma.brand.findUnique({
    where: { slug },
    include: brandInclude,
  });
  if (!brand) return null;
  return mapBrand(brand, resolveLocale(locale));
}
