/**
 * Frontend-safe catalog DTOs.
 *
 * Mapped once in `src/server/catalog/mappers.ts` so React never sees
 * Prisma `Decimal`, `Date`, or model objects. Money is a JS `number` (GEL).
 */
import type { Locale } from "@/generated/prisma/client";

export type CatalogBrand = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  indexable: boolean;
  canonicalOverride: string | null;
};

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  imageUrl: string | null;
  iconKey: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  indexable: boolean;
  canonicalOverride: string | null;
  children: CatalogCategory[];
};

export type CatalogImage = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
};

export type CatalogSpecGroup = {
  groupSlug: string;
  groupName: string;
  items: { specSlug: string; label: string; value: string; numericValue: number | null; unit: string | null }[];
};

export type CatalogVariantOption = {
  attributeSlug: string;
  attributeName: string;
  optionSlug: string;
  optionName: string;
  swatch: string | null;
};

export type CatalogProductVariant = {
  id: string;
  sku: string;
  price: number;
  stockQuantity: number;
  inStock: boolean;
  options: CatalogVariantOption[];
};

export type CatalogSeo = {
  title: string | null;
  description: string | null;
  indexable: boolean;
  canonicalOverride: string | null;
};

export type CatalogInstallment = {
  months: number;
  monthlyPrice: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  brand: CatalogBrand;
  category: { id: string; slug: string; name: string };
  price: number;
  previousPrice: number | null;
  stockQuantity: number;
  inStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  featuredSort: number | null;
  newArrivalSort: number | null;
  illustrationKey: string | null;
  illustrationTone: number | null;
  ratingAverage: number | null;
  reviewCount: number;
  warrantyMonths: number | null;
  warranty: string | null;
  returnDays: number | null;
  deliveryEstimate: string | null;
  badgeKind: string | null;
  badgeLabel: string | null;
  stockStatus: string;
  storageLabel: string | null;
  ramLabel: string | null;
  images: CatalogImage[];
  highlights: string[];
  packageItems: string[];
  specs: CatalogSpecGroup[];
  variants: CatalogProductVariant[];
  installments: CatalogInstallment[];
  seo: CatalogSeo;
};

export type ProductListFilters = {
  locale?: Locale;
  categorySlug?: string;
  brandSlug?: string;
  featured?: boolean;
  /** Homepage new-arrivals row (`newArrivalSort` set), not every `isNew` product. */
  newArrivals?: boolean;
  isNew?: boolean;
  active?: boolean;
  search?: string;
  take?: number;
  skip?: number;
};
