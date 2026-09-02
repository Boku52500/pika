import type { Prisma } from "@/generated/prisma/client";
import { resolveImportCategory } from "@/lib/productImport/categoryAliases";
import { catalogIdentityKey, catalogSlug } from "@/lib/productImport/slug";
import type { CatalogLabelRecord, ExistingSkuRecord, PlanImportContext } from "@/lib/productImport/planImport";
import type { ImportExecutionResult, PlannedProduct, RowIssue } from "@/lib/productImport/types";
import { parseMoneyInput } from "@/server/money";
import { prisma } from "@/server/prisma";

type LabelCache = Map<string, { id: string; created: boolean; displayName: string }>;

export async function loadPlanImportContext(): Promise<PlanImportContext> {
  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({
      select: {
        sku: true,
        id: true,
        translations: { where: { locale: "ka" }, select: { name: true }, take: 1 },
      },
    }),
    prisma.categoryTranslation.findMany({
      where: { locale: "ka" },
      select: { name: true },
    }),
    prisma.brandTranslation.findMany({
      where: { locale: "ka" },
      select: { name: true },
    }),
  ]);

  const existingSkus = new Map<string, ExistingSkuRecord>();
  for (const product of products) {
    existingSkus.set(product.sku, {
      sku: product.sku,
      productId: product.id,
      productName: product.translations[0]?.name ?? product.sku,
    });
  }

  const existingCategories = new Map<string, CatalogLabelRecord>();
  for (const row of categories) {
    const key = catalogIdentityKey(row.name);
    if (!existingCategories.has(key)) {
      existingCategories.set(key, { key, displayName: row.name });
    }
  }

  const existingBrands = new Map<string, CatalogLabelRecord>();
  for (const row of brands) {
    const key = catalogIdentityKey(row.name);
    if (!existingBrands.has(key)) {
      existingBrands.set(key, { key, displayName: row.name });
    }
  }

  const slugRows = await prisma.product.findMany({ select: { slug: true } });
  const categorySlugRows = await prisma.category.findMany({ select: { slug: true } });
  const brandSlugRows = await prisma.brand.findMany({ select: { slug: true } });

  const existingSlugs = new Set([
    ...slugRows.map((row) => row.slug),
    ...categorySlugRows.map((row) => row.slug),
    ...brandSlugRows.map((row) => row.slug),
  ]);

  return { existingSkus, existingSlugs, existingCategories, existingBrands };
}

async function ensureUniqueCatalogSlug(
  tx: Prisma.TransactionClient,
  table: "brand" | "category",
  baseSlug: string,
): Promise<string> {
  let candidate = baseSlug;
  let index = 2;
  while (index < 10_000) {
    const exists =
      table === "brand"
        ? await tx.brand.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await tx.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    candidate = `${baseSlug}-${index}`;
    index += 1;
  }
  return `${baseSlug}-${Date.now()}`;
}

async function findOrCreateBrand(
  tx: Prisma.TransactionClient,
  label: string,
  cache: LabelCache,
  createdBrands: Set<string>,
): Promise<string> {
  const key = catalogIdentityKey(label);
  const cached = cache.get(`brand:${key}`);
  if (cached) return cached.id;

  const translations = await tx.brandTranslation.findMany({
    where: { locale: "ka" },
    select: { brandId: true, name: true },
  });
  const match = translations.find((row) => catalogIdentityKey(row.name) === key);
  if (match) {
    cache.set(`brand:${key}`, { id: match.brandId, created: false, displayName: label });
    return match.brandId;
  }

  const displayName = label.trim();
  const baseSlug = catalogSlug(displayName, "brand");
  const slug = await ensureUniqueCatalogSlug(tx, "brand", baseSlug);
  const brand = await tx.brand.create({
    data: {
      slug,
      indexable: true,
      sortOrder: 0,
      showOnHomepage: false,
      homepageSortOrder: 0,
      translations: {
        create: {
          locale: "ka",
          name: displayName,
        },
      },
    },
  });

  createdBrands.add(displayName);
  cache.set(`brand:${key}`, { id: brand.id, created: true, displayName });
  return brand.id;
}

async function findOrCreateCategory(
  tx: Prisma.TransactionClient,
  label: string,
  cache: LabelCache,
  createdCategories: Set<string>,
): Promise<string> {
  const resolved = resolveImportCategory(label);
  const lookupLabel = resolved.resolvedLabel;
  const key = catalogIdentityKey(lookupLabel);
  const cached = cache.get(`category:${key}`);
  if (cached) return cached.id;

  const translations = await tx.categoryTranslation.findMany({
    where: { locale: "ka" },
    select: { categoryId: true, name: true },
  });
  const match = translations.find((row) => catalogIdentityKey(row.name) === key);
  if (match) {
    cache.set(`category:${key}`, { id: match.categoryId, created: false, displayName: lookupLabel });
    return match.categoryId;
  }

  const displayName = lookupLabel.trim();
  const baseSlug = catalogSlug(displayName, "category");
  const slug = await ensureUniqueCatalogSlug(tx, "category", baseSlug);
  const category = await tx.category.create({
    data: {
      slug,
      isActive: true,
      sortOrder: 0,
      showInMainNav: false,
      navSortOrder: 0,
      showOnHomepage: false,
      homepageSortOrder: 0,
      indexable: true,
      translations: {
        create: {
          locale: "ka",
          name: displayName,
        },
      },
    },
  });

  createdCategories.add(displayName);
  cache.set(`category:${key}`, { id: category.id, created: true, displayName });
  return category.id;
}

async function importSingleProduct(
  product: PlannedProduct,
  cache: LabelCache,
  createdCategories: Set<string>,
  createdBrands: Set<string>,
): Promise<{ ok: true; id: string } | { ok: false; issue: RowIssue }> {
  try {
    const id = await prisma.$transaction(async (tx) => {
      const brandId = await findOrCreateBrand(tx, product.brand, cache, createdBrands);
      const categoryId = await findOrCreateCategory(tx, product.category, cache, createdCategories);
      const price = parseMoneyInput(product.price);

      const row = await tx.product.create({
        data: {
          sku: product.sku,
          slug: product.slug,
          brandId,
          categoryId,
          price,
          previousPrice: null,
          stockQuantity: 0,
          stockStatus: "in-stock",
          isActive: true,
          isFeatured: false,
          isNew: false,
          indexable: true,
          translations: {
            create: {
              locale: "ka",
              name: product.name,
              shortDescription: product.shortDescription,
              description: product.fullDescription,
              seoTitle: product.seoTitle,
              seoDescription: product.seoDescription,
            },
          },
        },
        select: { id: true },
      });

      return row.id;
    });

    return { ok: true, id };
  } catch (error) {
    return {
      ok: false,
      issue: {
        excelRowNumber: product.excelRowNumber,
        sku: product.sku,
        code: "IMPORT_FAILED",
        message: error instanceof Error ? error.message : "Import failed",
      },
    };
  }
}

export async function executeProductImport(products: PlannedProduct[]): Promise<ImportExecutionResult> {
  const cache: LabelCache = new Map();
  const createdCategories = new Set<string>();
  const createdBrands = new Set<string>();
  const createdProductIds: string[] = [];
  const failed: RowIssue[] = [];

  for (const product of products) {
    const result = await importSingleProduct(product, cache, createdCategories, createdBrands);
    if (result.ok) {
      createdProductIds.push(result.id);
    } else {
      failed.push(result.issue);
    }
  }

  return {
    createdProductIds,
    createdCategories: [...createdCategories].sort((a, b) => a.localeCompare(b, "ka")),
    createdBrands: [...createdBrands].sort((a, b) => a.localeCompare(b, "ka")),
    skipped: [],
    failed,
  };
}

/**
 * Update ONLY AI/generated content fields + approved slug for an existing Excel-import SKU.
 * Does not invent images/specs/variants. Does not change brand/category IDs.
 * Optionally syncs Excel-authoritative name + price.
 */
export async function updateExistingProductAiContent(input: {
  sku: string;
  excelRowNumber: number;
  name: string;
  price: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  seoTitle: string;
  seoDescription: string;
  syncExcelNameAndPrice?: boolean;
}): Promise<{ ok: true; id: string; slugChanged: boolean } | { ok: false; issue: RowIssue }> {
  try {
    const existing = await prisma.product.findUnique({
      where: { sku: input.sku },
      select: {
        id: true,
        slug: true,
        translations: { where: { locale: "ka" }, select: { id: true }, take: 1 },
      },
    });
    if (!existing) {
      return {
        ok: false,
        issue: {
          excelRowNumber: input.excelRowNumber,
          sku: input.sku,
          code: "IMPORT_FAILED",
          message: "SKU not found for content update",
        },
      };
    }

    let targetSlug = input.slug;
    if (targetSlug !== existing.slug) {
      const clash = await prisma.product.findFirst({
        where: { slug: targetSlug, NOT: { id: existing.id } },
        select: { sku: true },
      });
      if (clash) {
        const withSku = `${targetSlug}-${input.sku}`.slice(0, 72).replace(/-+$/g, "");
        const stillClash = await prisma.product.findFirst({
          where: { slug: withSku, NOT: { id: existing.id } },
          select: { sku: true },
        });
        if (stillClash) {
          return {
            ok: false,
            issue: {
              excelRowNumber: input.excelRowNumber,
              sku: input.sku,
              code: "SLUG_CONFLICT",
              message: `Slug conflict with SKU ${clash.sku}; fallback ${withSku} also taken`,
            },
          };
        }
        targetSlug = withSku;
      }
    }

    const price = parseMoneyInput(input.price);
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          slug: targetSlug,
          ...(input.syncExcelNameAndPrice ? { price } : {}),
        },
      });

      const translationId = existing.translations[0]?.id;
      if (translationId) {
        await tx.productTranslation.update({
          where: { id: translationId },
          data: {
            ...(input.syncExcelNameAndPrice ? { name: input.name } : {}),
            shortDescription: input.shortDescription,
            description: input.fullDescription,
            seoTitle: input.seoTitle,
            seoDescription: input.seoDescription,
          },
        });
      } else {
        await tx.productTranslation.create({
          data: {
            productId: existing.id,
            locale: "ka",
            name: input.name,
            shortDescription: input.shortDescription,
            description: input.fullDescription,
            seoTitle: input.seoTitle,
            seoDescription: input.seoDescription,
          },
        });
      }
    });

    return { ok: true, id: existing.id, slugChanged: targetSlug !== existing.slug };
  } catch (error) {
    return {
      ok: false,
      issue: {
        excelRowNumber: input.excelRowNumber,
        sku: input.sku,
        code: "IMPORT_FAILED",
        message: error instanceof Error ? error.message : "Content update failed",
      },
    };
  }
}

export async function verifyImportedProducts(productIds: string[]): Promise<
  Array<{
    id: string;
    sku: string;
    slug: string;
    price: string;
    name: string;
    category: string;
    brand: string;
    shortDescription: string | null;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    stockQuantity: number;
    previousPrice: string | null;
    isActive: boolean;
    stockStatus: string;
    variantCount: number;
    imageCount: number;
  }>
> {
  if (productIds.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: { id: { in: productIds.slice(0, 5) } },
    select: {
      id: true,
      sku: true,
      slug: true,
      price: true,
      previousPrice: true,
      stockQuantity: true,
      isActive: true,
      stockStatus: true,
      translations: {
        where: { locale: "ka" },
        select: {
          name: true,
          shortDescription: true,
          description: true,
          seoTitle: true,
          seoDescription: true,
        },
      },
      brand: { select: { translations: { where: { locale: "ka" }, select: { name: true } } } },
      category: { select: { translations: { where: { locale: "ka" }, select: { name: true } } } },
      _count: { select: { variants: true, images: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    price: row.price.toString(),
    previousPrice: row.previousPrice?.toString() ?? null,
    name: row.translations[0]?.name ?? "",
    category: row.category.translations[0]?.name ?? "",
    brand: row.brand.translations[0]?.name ?? "",
    shortDescription: row.translations[0]?.shortDescription ?? null,
    description: row.translations[0]?.description ?? null,
    seoTitle: row.translations[0]?.seoTitle ?? null,
    seoDescription: row.translations[0]?.seoDescription ?? null,
    stockQuantity: row.stockQuantity,
    isActive: row.isActive,
    stockStatus: row.stockStatus,
    variantCount: row._count.variants,
    imageCount: row._count.images,
  }));
}
