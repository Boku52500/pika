import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/prisma";
import { mapProduct, mapProductList } from "@/server/catalog/mappers";
import { productDetailInclude, productListInclude } from "@/server/catalog/include";
import type { CatalogProduct, ProductListFilters } from "@/server/catalog/types";
import { DEFAULT_LOCALE, resolveLocale } from "@/server/locale";
import { isStorefrontVisible, storefrontProductWhere } from "@/server/catalog/visibility";

async function categoryIdsForSlug(slug: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE tree AS (
      SELECT id FROM "Category" WHERE slug = ${slug}
      UNION ALL
      SELECT c.id FROM "Category" c INNER JOIN tree t ON c."parentId" = t.id
    )
    SELECT id FROM tree
  `;
  return rows.map((row) => row.id);
}

function productWhere(filters: ProductListFilters, categoryIds?: string[]): Prisma.ProductWhereInput {
  const active = filters.active ?? true;
  const search = filters.search?.trim();

  const where: Prisma.ProductWhereInput = storefrontProductWhere({
    isActive: active ? true : undefined,
    isFeatured: filters.featured ? true : undefined,
    isNew: filters.isNew ? true : undefined,
    newArrivalSort: filters.newArrivals ? { not: null } : undefined,
    brand: filters.brandSlug ? { slug: filters.brandSlug } : undefined,
    categoryId: categoryIds ? { in: categoryIds } : undefined,
  });

  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      {
        translations: {
          some: {
            locale: DEFAULT_LOCALE,
            name: { contains: search, mode: "insensitive" },
          },
        },
      },
    ];
  }

  return where;
}

function productOrderBy(filters: ProductListFilters): Prisma.ProductOrderByWithRelationInput[] {
  if (filters.featured) {
    return [{ featuredSort: { sort: "asc", nulls: "last" } }];
  }
  if (filters.newArrivals) {
    return [{ newArrivalSort: { sort: "asc", nulls: "last" } }];
  }
  return [{ isFeatured: "desc" }, { createdAt: "desc" }];
}

export async function getProductBySlug(
  slug: string,
  locale = DEFAULT_LOCALE,
): Promise<CatalogProduct | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: productDetailInclude,
  });
  if (!product || !isStorefrontVisible(product)) return null;
  return mapProduct(product, resolveLocale(locale));
}

export async function getProductById(
  id: string,
  locale = DEFAULT_LOCALE,
): Promise<CatalogProduct | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productDetailInclude,
  });
  if (!product || !isStorefrontVisible(product)) return null;
  return mapProduct(product, resolveLocale(locale));
}

export async function getProductsByIds(
  ids: string[],
  locale = DEFAULT_LOCALE,
): Promise<CatalogProduct[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const products = await prisma.product.findMany({
    where: storefrontProductWhere({ id: { in: unique } }),
    include: productDetailInclude,
  });

  const resolved = resolveLocale(locale);
  const mapped = new Map(products.map((product) => [product.id, mapProduct(product, resolved)]));
  return unique.map((id) => mapped.get(id)).filter((product): product is CatalogProduct => Boolean(product));
}

export async function getProducts(filters: ProductListFilters = {}): Promise<CatalogProduct[]> {
  const locale = resolveLocale(filters.locale);
  const categoryIds = filters.categorySlug ? await categoryIdsForSlug(filters.categorySlug) : undefined;
  if (filters.categorySlug && categoryIds && categoryIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: productWhere(filters, categoryIds),
    include: productListInclude,
    orderBy: productOrderBy(filters),
    take: filters.take,
    skip: filters.skip,
  });

  return products.map((product) => mapProductList(product, locale));
}

export async function getProductsByCategory(
  categorySlug: string,
  locale = DEFAULT_LOCALE,
): Promise<CatalogProduct[]> {
  return getProducts({ categorySlug, locale, active: true });
}

export async function getRelatedProducts(
  productIdOrSlug: string,
  limit = 8,
  locale = DEFAULT_LOCALE,
  known?: { productId: string; categoryId: string },
): Promise<CatalogProduct[]> {
  const resolved =
    known ??
    (await prisma.product.findFirst({
      where: { OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }] },
      select: { id: true, categoryId: true },
    }).then((row) => (row ? { productId: row.id, categoryId: row.categoryId } : null)));

  if (!resolved) return [];

  const { productId, categoryId } = resolved;

  const relations = await prisma.productRelation.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
    take: limit,
    include: { relatedProduct: { include: productListInclude } },
  });

  const related = relations
    .map((row) => row.relatedProduct)
    .filter((item) => isStorefrontVisible(item))
    .map((item) => mapProductList(item, resolveLocale(locale)));

  if (related.length > 0) return related.slice(0, limit);

  const fallback = await prisma.product.findMany({
    where: storefrontProductWhere({ categoryId, id: { not: productId } }),
    include: productListInclude,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return fallback.map((item) => mapProductList(item, resolveLocale(locale)));
}

export async function getRecommendedProducts(
  productIdOrSlug: string,
  excludeIds: string[] = [],
  limit = 8,
  locale = DEFAULT_LOCALE,
  knownProductId?: string,
): Promise<CatalogProduct[]> {
  const productId =
    knownProductId ??
    (
      await prisma.product.findFirst({
        where: { OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }] },
        select: { id: true },
      })
    )?.id;
  if (!productId) return [];

  const blocked = [...new Set([productId, ...excludeIds])];
  const recommended = await prisma.product.findMany({
    where: storefrontProductWhere({ id: { notIn: blocked } }),
    include: productListInclude,
    orderBy: [{ ratingAverage: { sort: "desc", nulls: "last" } }, { reviewCount: "desc" }],
    take: limit,
  });

  return recommended.map((item) => mapProductList(item, resolveLocale(locale)));
}
