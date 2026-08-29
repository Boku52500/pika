import type {
  Category,
  Product,
  ProductAvailability,
  ProductImageData,
  ProductInstallment,
  ProductSpecGroup,
  ProductVariantGroup,
  ProductVisual,
} from "@/types/product";
import type { CatalogCategory, CatalogImage, CatalogProduct } from "@/server/catalog/types";
import { isPublicImageUrl } from "@/lib/productImageLimits";

const PRODUCT_VISUALS: readonly ProductVisual[] = [
  "phone",
  "laptop",
  "tablet",
  "tv",
  "monitor",
  "gaming",
  "keyboard",
  "components",
  "accessory",
  "audio",
  "smart-home",
  "network",
];

function isProductVisual(value: string): value is ProductVisual {
  return (PRODUCT_VISUALS as readonly string[]).includes(value);
}

function asVisual(value: string | null | undefined): ProductVisual {
  if (value && isProductVisual(value)) return value;
  return "accessory";
}

function asTone(value: number | null | undefined): 1 | 2 | 3 | 4 | 5 {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) return value;
  return 1;
}

function parseMockImage(url: string, fallbackVisual: ProductVisual, fallbackTone: 1 | 2 | 3 | 4 | 5): ProductImageData {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "mock:") {
      const visual = asVisual(parsed.hostname || parsed.pathname.replace(/^\/+/, ""));
      const toneParam = parsed.searchParams.get("tone");
      const tone = toneParam ? asTone(Number(toneParam)) : fallbackTone;
      return { visual, tone };
    }
  } catch {
    // Non-URL seeds still fall back to the product illustration.
  }
  return { visual: fallbackVisual, tone: fallbackTone };
}

function mapImages(product: CatalogProduct, visual: ProductVisual, tone: 1 | 2 | 3 | 4 | 5): ProductImageData[] {
  return [...product.images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image: CatalogImage) => {
      const fallback = parseMockImage(image.url, visual, tone);
      const alt = image.alt.trim() || product.name;
      if (isPublicImageUrl(image.url)) {
        return { ...fallback, src: image.url, alt };
      }
      return { ...fallback, alt };
    });
}

function specValue(product: CatalogProduct, specSlug: string): string | undefined {
  for (const group of product.specs) {
    const item = group.items.find((entry) => entry.specSlug === specSlug);
    if (item?.value) return item.value;
  }
  return undefined;
}

function mapSpecs(product: CatalogProduct): ProductSpecGroup[] {
  return product.specs.map((group) => ({
    group: group.groupName,
    items: group.items.map((item) => ({ label: item.label, value: item.value })),
  }));
}

function mapVariantGroups(product: CatalogProduct): ProductVariantGroup[] {
  const groups: ProductVariantGroup[] = [];
  const bySlug = new Map<string, ProductVariantGroup>();

  for (const variant of product.variants) {
    for (const option of variant.options) {
      let group = bySlug.get(option.attributeSlug);
      if (!group) {
        group = { id: option.attributeSlug, label: option.attributeName, options: [] };
        bySlug.set(option.attributeSlug, group);
        groups.push(group);
      }
      if (!group.options.some((entry) => entry.value === option.optionSlug)) {
        group.options.push({
          value: option.optionSlug,
          label: option.optionName,
          swatch: option.swatch ?? undefined,
        });
      }
    }
  }

  return groups;
}

function mapAvailability(product: CatalogProduct): ProductAvailability {
  if (!product.isActive) return "out-of-stock";
  if (product.variants.length > 0) {
    return product.variants.some((variant) => variant.inStock) ? "in-stock" : "out-of-stock";
  }
  return product.inStock ? "in-stock" : "out-of-stock";
}

function mapInstallments(product: CatalogProduct): ProductInstallment[] {
  return [...product.installments].sort((a, b) => a.months - b.months);
}

function cardInstallment(options: ProductInstallment[]): ProductInstallment | undefined {
  if (options.length === 0) return undefined;
  return options.reduce((longest, term) => (term.months > longest.months ? term : longest));
}

function mapBadge(): Product["badge"] {
  return undefined;
}

/**
 * Catalog DTO → existing storefront `Product` shape.
 * Central mapping so ProductCard / PLP / PDP keep working without Prisma types.
 */
export function toStorefrontProduct(product: CatalogProduct): Product {
  const visual = asVisual(product.illustrationKey);
  const tone = asTone(product.illustrationTone);
  const images = mapImages(product, visual, tone);
  const installmentOptions = mapInstallments(product);
  const secondaryFromGallery = images.find((image) => image.visual !== visual)?.visual;

  return {
    id: product.id,
    slug: product.slug,
    brand: product.brand.name,
    name: product.name,
    category: product.category.slug,
    categoryName: product.category.name,
    visual,
    tone,
    secondaryVisual: secondaryFromGallery,
    rating: product.ratingAverage ?? 0,
    reviewCount: product.reviewCount,
    price: product.price,
    previousPrice: product.previousPrice ?? undefined,
    installment: cardInstallment(installmentOptions),
    installmentOptions: installmentOptions.length ? installmentOptions : undefined,
    availability: mapAvailability(product),
    isNew: product.isNew || undefined,
    badge: mapBadge(),
    storage: product.storageLabel ?? specValue(product, "storage"),
    ram: product.ramLabel ?? specValue(product, "ram"),
    sku: product.sku,
    images: images.length ? images : undefined,
    warranty: product.warranty ?? undefined,
    shortDescription: product.shortDescription ?? undefined,
    description: product.description ?? undefined,
    keyFeatures: product.highlights.length ? product.highlights : undefined,
    specs: product.specs.length ? mapSpecs(product) : undefined,
    whatsIncluded: product.packageItems.length ? product.packageItems : undefined,
    delivery:
      product.deliveryEstimate || product.returnDays != null
        ? {
            estimate: product.deliveryEstimate ?? "თბილისში — 1 დღეში, რეგიონებში — 1-დან 3 დღემდე",
            returnDays: product.returnDays ?? 14,
          }
        : undefined,
    variants: product.variants.length ? mapVariantGroups(product) : undefined,
  };
}

export function toStorefrontCategory(category: CatalogCategory, productCount: number): Category {
  return {
    id: category.slug,
    name: category.name,
    href: `/category/${category.slug}`,
    visual: asVisual(category.iconKey),
    description: category.description ?? undefined,
    productCount,
  };
}
