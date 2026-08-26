import type {
  Brand,
  BrandTranslation,
  Category,
  CategoryTranslation,
  Product,
  ProductHighlight,
  ProductHighlightTranslation,
  ProductImage,
  ProductImageTranslation,
  ProductInstallmentTerm,
  ProductPackageItem,
  ProductPackageItemTranslation,
  ProductSpecification,
  ProductTranslation,
  ProductVariant,
  ProductVariantOption,
  SpecificationDefinition,
  SpecificationDefinitionTranslation,
  SpecificationGroup,
  SpecificationGroupTranslation,
  VariantAttribute,
  VariantAttributeOption,
  VariantAttributeOptionTranslation,
  VariantAttributeTranslation,
} from "@/generated/prisma/client";
import { decimalToNumber, moneyToNumber } from "@/server/money";
import { DEFAULT_LOCALE, pickTranslation, type AppLocale } from "@/server/locale";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogImage,
  CatalogProduct,
  CatalogProductVariant,
  CatalogSpecGroup,
} from "@/server/catalog/types";

type BrandWithTranslations = Brand & { translations: BrandTranslation[] };
type CategoryWithTranslations = Category & { translations: CategoryTranslation[] };

type SpecWithGroup = ProductSpecification & {
  specification: SpecificationDefinition & {
    translations: SpecificationDefinitionTranslation[];
    group: SpecificationGroup & { translations: SpecificationGroupTranslation[] };
  };
};

type VariantWithOptions = ProductVariant & {
  options: (ProductVariantOption & {
    option: VariantAttributeOption & {
      translations: VariantAttributeOptionTranslation[];
      attribute: VariantAttribute & { translations: VariantAttributeTranslation[] };
    };
  })[];
};

type ProductRecord = Product & {
  translations: ProductTranslation[];
  brand: BrandWithTranslations;
  category: CategoryWithTranslations;
  images: (ProductImage & { translations: ProductImageTranslation[] })[];
  highlights: (ProductHighlight & { translations: ProductHighlightTranslation[] })[];
  packageItems: (ProductPackageItem & { translations: ProductPackageItemTranslation[] })[];
  specifications: SpecWithGroup[];
  variants: VariantWithOptions[];
  installmentTerms: ProductInstallmentTerm[];
};

/**
 * Prisma model → JSON-serializable catalog DTO.
 * All money conversion happens here (`moneyToNumber` / `decimalToNumber`).
 */
export function mapBrand(brand: BrandWithTranslations, locale: AppLocale = DEFAULT_LOCALE): CatalogBrand {
  const t = pickTranslation(brand.translations, locale);
  return {
    id: brand.id,
    slug: brand.slug,
    name: t.name,
    description: t.description,
    logoUrl: brand.logoUrl,
    seoTitle: t.seoTitle,
    seoDescription: t.seoDescription,
    indexable: brand.indexable,
    canonicalOverride: brand.canonicalOverride,
  };
}

export function mapCategory(
  category: CategoryWithTranslations & { children?: CategoryWithTranslations[] },
  locale: AppLocale = DEFAULT_LOCALE,
): CatalogCategory {
  const t = pickTranslation(category.translations, locale);
  return {
    id: category.id,
    slug: category.slug,
    name: t.name,
    description: t.description,
    parentId: category.parentId,
    imageUrl: category.imageUrl,
    iconKey: category.iconKey,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    seoTitle: t.seoTitle,
    seoDescription: t.seoDescription,
    indexable: category.indexable,
    canonicalOverride: category.canonicalOverride,
    children: (category.children ?? []).map((child) => mapCategory(child, locale)),
  };
}

function effectiveStock(product: ProductRecord): number {
  if (product.variants.length > 0) {
    return product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
  }
  return product.stockQuantity;
}

function mapImages(product: ProductRecord, locale: AppLocale): CatalogImage[] {
  return [...product.images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => ({
      id: image.id,
      url: image.url,
      alt: pickTranslation(image.translations, locale).alt,
      sortOrder: image.sortOrder,
    }));
}

function mapSpecs(product: ProductRecord, locale: AppLocale): CatalogSpecGroup[] {
  const groups = new Map<string, CatalogSpecGroup>();

  for (const row of product.specifications) {
    const group = row.specification.group;
    const groupName = pickTranslation(group.translations, locale).name;
    const label = pickTranslation(row.specification.translations, locale).name;
    let entry = groups.get(group.slug);
    if (!entry) {
      entry = { groupSlug: group.slug, groupName, items: [] };
      groups.set(group.slug, entry);
    }
    entry.items.push({
      specSlug: row.specification.slug,
      label,
      value: row.value,
      numericValue: row.numericValue == null ? null : decimalToNumber(row.numericValue),
      unit: row.specification.unit,
    });
  }

  return [...groups.values()];
}

function mapVariants(product: ProductRecord, locale: AppLocale): CatalogProductVariant[] {
  const basePrice = moneyToNumber(product.price);
  return product.variants.map((variant) => {
    const price = variant.priceOverride == null ? basePrice : moneyToNumber(variant.priceOverride);
    return {
      id: variant.id,
      sku: variant.sku,
      price,
      stockQuantity: variant.stockQuantity,
      inStock: variant.stockQuantity > 0,
      options: variant.options.map((selection) => ({
        attributeSlug: selection.option.attribute.slug,
        attributeName: pickTranslation(selection.option.attribute.translations, locale).name,
        optionSlug: selection.option.slug,
        optionName: pickTranslation(selection.option.translations, locale).name,
        swatch: selection.option.swatch,
      })),
    };
  });
}

export function mapProduct(product: ProductRecord, locale: AppLocale = DEFAULT_LOCALE): CatalogProduct {
  const t = pickTranslation(product.translations, locale);
  const stockQuantity = effectiveStock(product);

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: t.name,
    shortDescription: t.shortDescription,
    description: t.description,
    brand: mapBrand(product.brand, locale),
    category: {
      id: product.category.id,
      slug: product.category.slug,
      name: pickTranslation(product.category.translations, locale).name,
    },
    price: moneyToNumber(product.price),
    previousPrice: product.previousPrice == null ? null : moneyToNumber(product.previousPrice),
    stockQuantity,
    inStock: stockQuantity > 0,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    images: mapImages(product, locale),
    highlights: [...product.highlights]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => pickTranslation(row.translations, locale).text),
    packageItems: [...product.packageItems]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => pickTranslation(row.translations, locale).text),
    specs: mapSpecs(product, locale),
    variants: mapVariants(product, locale),
    installments: [...product.installmentTerms]
      .sort((a, b) => a.months - b.months)
      .map((term) => ({
        months: term.months,
        monthlyPrice: moneyToNumber(term.monthlyPrice),
      })),
    seo: {
      title: t.seoTitle,
      description: t.seoDescription,
      indexable: product.indexable,
      canonicalOverride: product.canonicalOverride,
    },
    featuredSort: product.featuredSort,
    newArrivalSort: product.newArrivalSort,
    illustrationKey: product.illustrationKey,
    illustrationTone: product.illustrationTone,
    ratingAverage: product.ratingAverage == null ? null : decimalToNumber(product.ratingAverage),
    reviewCount: product.reviewCount,
    warrantyMonths: product.warrantyMonths,
    warranty: t.warranty,
    returnDays: product.returnDays,
    deliveryEstimate: t.deliveryEstimate,
    badgeKind: product.badgeKind,
    badgeLabel: product.badgeLabel,
    stockStatus: product.stockStatus,
    storageLabel: product.storageLabel,
    ramLabel: product.ramLabel,
  };
}
