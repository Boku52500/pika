import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { DEFAULT_LOCALE, pickTranslation } from "@/server/locale";
import { moneyToNumber } from "@/server/money";
import {
  effectiveStockQuantity,
  stockStateFromQuantity,
  type StockState,
} from "@/server/admin/stock";

export const ADMIN_PAGE_SIZE = 20;

export type AdminProductListFilters = {
  q?: string;
  categoryId?: string;
  brandId?: string;
  active?: "all" | "active" | "inactive" | "archived";
  stock?: "all" | "in-stock" | "low-stock" | "out-of-stock";
  page?: number;
};

export type AdminProductListRow = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string;
  brandName: string;
  categoryName: string;
  price: number;
  previousPrice: number | null;
  stockQuantity: number;
  stockState: StockState;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  badgeLabel: string | null;
  deletedAt: Date | null;
};

export type AdminLookupOption = { id: string; name: string; slug: string };

export type AdminVariantAttributeOption = {
  id: string;
  slug: string;
  name: string;
  swatch: string | null;
};

export type AdminVariantAttribute = {
  id: string;
  slug: string;
  name: string;
  options: AdminVariantAttributeOption[];
};

export type AdminSpecDefinition = {
  id: string;
  slug: string;
  name: string;
  unit: string | null;
  values: { id: string; name: string }[];
};

export type AdminSpecGroup = {
  id: string;
  slug: string;
  name: string;
  definitions: AdminSpecDefinition[];
};

export type AdminProductEditorData = {
  id: string;
  sku: string;
  slug: string;
  brandId: string;
  categoryId: string;
  price: string;
  previousPrice: string;
  stockQuantity: number;
  stockStatus: StockState;
  isActive: boolean;
  deletedAt: string | null;
  isFeatured: boolean;
  isNew: boolean;
  featuredSort: number | null;
  newArrivalSort: number | null;
  badgeKind: string;
  badgeLabel: string;
  indexable: boolean;
  warrantyMonths: number | null;
  returnDays: number | null;
  translations: {
    ka: AdminProductTranslation;
    en: AdminProductTranslation;
    ru: AdminProductTranslation;
  };
  images: { id: string; url: string; alt: string; sortOrder: number; objectKey: string | null }[];
  variants: {
    id: string;
    sku: string;
    priceOverride: string;
    stockQuantity: number;
    isActive: boolean;
    optionIds: string[];
  }[];
  specifications: { specificationId: string; valueId: string; value: string }[];
};

export type AdminProductTranslation = {
  name: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  warranty: string;
  deliveryEstimate: string;
};

function emptyTranslation(): AdminProductTranslation {
  return {
    name: "",
    shortDescription: "",
    description: "",
    seoTitle: "",
    seoDescription: "",
    warranty: "",
    deliveryEstimate: "",
  };
}

function moneyInput(value: Prisma.Decimal | string | number | null | undefined): string {
  if (value == null) return "";
  const n = moneyToNumber(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export async function listAdminFilterOptions(): Promise<{
  brands: AdminLookupOption[];
  categories: AdminLookupOption[];
}> {
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({
      include: { translations: true },
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
    prisma.category.findMany({
      include: { translations: true },
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
  ]);

  return {
    brands: brands.map((brand) => ({
      id: brand.id,
      slug: brand.slug,
      name: pickTranslation(brand.translations).name,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: pickTranslation(category.translations).name,
    })),
  };
}

export async function getAdminCatalogLookups(): Promise<{
  brands: AdminLookupOption[];
  categories: AdminLookupOption[];
  variantAttributes: AdminVariantAttribute[];
  specGroups: AdminSpecGroup[];
  specDefinitions: AdminSpecDefinition[];
}> {
  const [filters, attributes, groups] = await Promise.all([
    listAdminFilterOptions(),
    prisma.variantAttribute.findMany({
      include: {
        translations: true,
        options: { include: { translations: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.specificationGroup.findMany({
      include: {
        translations: true,
        definitions: {
          include: { translations: true, libraryValues: { include: { translations: true }, orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return {
    ...filters,
    variantAttributes: attributes.map((attribute) => ({
      id: attribute.id,
      slug: attribute.slug,
      name: pickTranslation(attribute.translations).name,
      options: attribute.options.map((option) => ({
        id: option.id,
        slug: option.slug,
        name: pickTranslation(option.translations).name,
        swatch: option.swatch,
      })),
    })),
    specGroups: groups.map((group) => ({
      id: group.id,
      slug: group.slug,
      name: pickTranslation(group.translations).name,
      definitions: group.definitions.map((definition) => ({
        id: definition.id,
        slug: definition.slug,
        name: pickTranslation(definition.translations).name,
        unit: definition.unit,
        values: definition.libraryValues.map((value) => ({
          id: value.id,
          name: pickTranslation(value.translations).name,
        })),
      })),
    })),
    specDefinitions: groups.flatMap((group) =>
      group.definitions.map((definition) => ({
        id: definition.id,
        slug: definition.slug,
        name: pickTranslation(definition.translations).name,
        unit: definition.unit,
        values: definition.libraryValues.map((value) => ({
          id: value.id,
          name: pickTranslation(value.translations).name,
        })),
      })),
    ),
  };
}

function productListWhere(filters: AdminProductListFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { sku: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { translations: { some: { locale: DEFAULT_LOCALE, name: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.brandId) where.brandId = filters.brandId;
  if (filters.active === "archived") {
    where.deletedAt = { not: null };
  } else {
    where.deletedAt = null;
    if (filters.active === "active") where.isActive = true;
    if (filters.active === "inactive") where.isActive = false;
  }
  if (filters.stock === "out-of-stock") {
    where.stockQuantity = { lte: 0 };
  } else if (filters.stock === "low-stock") {
    where.stockQuantity = { gt: 0, lte: 3 };
  } else if (filters.stock === "in-stock") {
    where.stockQuantity = { gt: 3 };
  }
  return where;
}

export async function listAdminProducts(filters: AdminProductListFilters): Promise<{
  rows: AdminProductListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const where = productListWhere(filters);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        translations: true,
        brand: { include: { translations: true } },
        category: { include: { translations: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, include: { translations: true } },
        variants: { select: { stockQuantity: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const rows: AdminProductListRow[] = products.map((product) => {
    const stockQuantity = effectiveStockQuantity(
      product.stockQuantity,
      product.variants.map((variant) => variant.stockQuantity),
    );
    const image = product.images[0];
    return {
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      name: pickTranslation(product.translations).name,
      imageUrl: image?.url ?? null,
      imageAlt: image ? pickTranslation(image.translations).alt : "",
      brandName: pickTranslation(product.brand.translations).name,
      categoryName: pickTranslation(product.category.translations).name,
      price: moneyToNumber(product.price),
      previousPrice: product.previousPrice == null ? null : moneyToNumber(product.previousPrice),
      stockQuantity,
      stockState: stockStateFromQuantity(stockQuantity),
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      isNew: product.isNew,
      badgeLabel: product.badgeLabel,
      deletedAt: product.deletedAt,
    };
  });

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function mapTranslation(
  rows: {
    locale: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    warranty: string | null;
    deliveryEstimate: string | null;
  }[],
  locale: "ka" | "en" | "ru",
): AdminProductTranslation {
  const row = rows.find((item) => item.locale === locale);
  if (!row) return emptyTranslation();
  return {
    name: row.name,
    shortDescription: row.shortDescription ?? "",
    description: row.description ?? "",
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    warranty: row.warranty ?? "",
    deliveryEstimate: row.deliveryEstimate ?? "",
  };
}

export async function getAdminProductEditor(id: string): Promise<AdminProductEditorData | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      translations: true,
      images: { orderBy: { sortOrder: "asc" }, include: { translations: true } },
      variants: { include: { options: true }, orderBy: { createdAt: "asc" } },
      specifications: true,
    },
  });
  if (!product) return null;

  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    brandId: product.brandId,
    categoryId: product.categoryId,
    price: moneyInput(product.price),
    previousPrice: moneyInput(product.previousPrice),
    stockQuantity: product.stockQuantity,
    stockStatus: stockStateFromQuantity(product.stockQuantity),
    isActive: product.isActive,
    deletedAt: product.deletedAt?.toISOString() ?? null,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    featuredSort: product.featuredSort,
    newArrivalSort: product.newArrivalSort,
    badgeKind: product.badgeKind ?? "",
    badgeLabel: product.badgeLabel ?? "",
    indexable: product.indexable,
    warrantyMonths: product.warrantyMonths,
    returnDays: product.returnDays,
    translations: {
      ka: mapTranslation(product.translations, "ka"),
      en: mapTranslation(product.translations, "en"),
      ru: mapTranslation(product.translations, "ru"),
    },
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: pickTranslation(image.translations).alt,
      sortOrder: image.sortOrder,
      objectKey: image.objectKey,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      priceOverride: moneyInput(variant.priceOverride),
      stockQuantity: variant.stockQuantity,
      isActive: variant.isActive,
      optionIds: variant.options.map((option) => option.optionId),
    })),
    specifications: product.specifications.map((row) => ({
      specificationId: row.specificationId,
      valueId: row.valueId ?? "",
      value: row.value,
    })),
  };
}

export function emptyProductEditor(): AdminProductEditorData {
  return {
    id: "",
    sku: "",
    slug: "",
    brandId: "",
    categoryId: "",
    price: "",
    previousPrice: "",
    stockQuantity: 0,
    stockStatus: "out-of-stock",
    isActive: true,
    deletedAt: null,
    isFeatured: false,
    isNew: false,
    featuredSort: null,
    newArrivalSort: null,
    badgeKind: "",
    badgeLabel: "",
    indexable: true,
    warrantyMonths: null,
    returnDays: 14,
    translations: {
      ka: emptyTranslation(),
      en: emptyTranslation(),
      ru: emptyTranslation(),
    },
    images: [],
    variants: [],
    specifications: [],
  };
}
