export type ProductAvailability = "in-stock" | "low-stock" | "out-of-stock";

/** Visual category used to pick a mock illustration until real photography exists. */
export type ProductVisual =
  | "phone"
  | "laptop"
  | "tablet"
  | "tv"
  | "monitor"
  | "gaming"
  | "keyboard"
  | "components"
  | "accessory"
  | "audio"
  | "smart-home"
  | "network";

/** Canonical merchandising badges reused across every product surface. */
export type ProductBadgeKind = "bestseller" | "top-seller" | "limited" | "custom";

export interface ProductBadgeData {
  kind: ProductBadgeKind;
  /** Required when kind is "custom"; optional override for the other kinds. */
  label?: string;
}

export interface ProductInstallment {
  months: number;
  monthlyPrice: number;
}

/** One row inside a grouped technical-specification table. */
export interface ProductSpecItem {
  label: string;
  value: string;
}

/** A named group of specs, e.g. { group: "ეკრანი", items: [...] }. */
export interface ProductSpecGroup {
  group: string;
  items: ProductSpecItem[];
}

export interface ProductVariantOption {
  value: string;
  label: string;
  /** Hex color — when present, renders a circular color swatch instead of a text pill. */
  swatch?: string;
}

/** A selectable variant axis (color, storage, RAM…) shown on the PDP. Selection is visual-only for now. */
export interface ProductVariantGroup {
  id: string;
  label: string;
  options: ProductVariantOption[];
}

export interface ProductDelivery {
  /** Human-readable delivery estimate, e.g. "თბილისში — 1 დღეში". */
  estimate: string;
  returnDays: number;
}

/** One gallery image slot. Real photography uses `src`; mock illustrations use visual/tone. */
export interface ProductImageData {
  visual: ProductVisual;
  tone?: 1 | 2 | 3 | 4 | 5;
  src?: string;
  alt?: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  title?: string;
  body: string;
  verified?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  brand: string;
  name: string;
  /** Category id — mirrors Category["id"] / primaryNav ids. */
  category: string;
  /** Georgian category label for filters/chips. Optional so mock snapshot products still type-check. */
  categoryName?: string;
  visual: ProductVisual;
  /** 1 (light) - 5 (dark) — used to vary the mock product-image tint. */
  tone: 1 | 2 | 3 | 4 | 5;
  /**
   * Optional second mock "photo" shown when the image is hovered, mirroring
   * how a real product gallery would swap to a lifestyle/angle shot.
   */
  secondaryVisual?: ProductVisual;
  rating: number;
  reviewCount: number;
  price: number;
  previousPrice?: number;
  installment?: ProductInstallment;
  availability: ProductAvailability;
  isNew?: boolean;
  badge?: ProductBadgeData;
  /** Optional specs used by category-page filters when relevant (phones, laptops, tablets…). */
  storage?: string;
  ram?: string;

  // ---- Product detail page (PDP) fields — all optional so the whole
  // catalogue keeps working; `src/lib/productDetails.ts` derives sensible
  // fallbacks for any product that doesn't set them explicitly. ----

  /** Model/SKU code shown on the PDP. Falls back to a generated code. */
  sku?: string;
  /** Full PDP gallery. Falls back to `visual`/`secondaryVisual` when omitted. */
  images?: ProductImageData[];
  /** Multiple financing terms for the PDP price block. Falls back to `installment` (single term). */
  installmentOptions?: ProductInstallment[];
  warranty?: string;
  /** Short one-line teaser shown right under the title on the PDP. */
  shortDescription?: string;
  /** Full PDP "აღწერა" (description) copy. */
  description?: string;
  /** Bullet highlights for the "ძირითადი მახასიათებლები" section. */
  keyFeatures?: string[];
  /** Grouped technical specifications for the "ტექნიკური მახასიათებლები" section. */
  specs?: ProductSpecGroup[];
  /** "კომპლექტაცია" — what's in the box. */
  whatsIncluded?: string[];
  delivery?: ProductDelivery;
  /** Explicit related-product ids; falls back to same-category products when omitted. */
  relatedIds?: string[];
  /** Selectable variant axes (color, storage, RAM…) — visual-only, no price/SKU switching yet. */
  variants?: ProductVariantGroup[];
  reviews?: ProductReview[];
  /** Star -> count breakdown for the reviews summary. Falls back to a synthesized distribution. */
  ratingBreakdown?: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
}

export interface Category {
  id: string;
  name: string;
  href: string;
  visual: ProductVisual;
  productCount?: number;
  /** Longer intro copy shown at the top of the category (PLP) page. */
  description?: string;
}

export interface NavLink {
  id: string;
  name: string;
  href: string;
  highlight?: boolean;
}
