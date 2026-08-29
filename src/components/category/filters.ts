import type { Product, ProductAvailability } from "@/types/product";

/**
 * Pure filter/sort logic shared by the category page, the search results
 * page, and their sidebars — kept free of React so it's trivial to unit
 * test and reuse anywhere, since every option below is derived from
 * whatever product list is passed in rather than hardcoded per page.
 */
export interface CategoryFilterState {
  /** Only meaningful on pages spanning multiple categories (e.g. search results) — a single-category page will simply never show this facet. */
  categories: string[];
  brands: string[];
  storage: string[];
  ram: string[];
  availability: ProductAvailability[];
  priceMin: number | null;
  priceMax: number | null;
}

export const emptyFilters: CategoryFilterState = {
  categories: [],
  brands: [],
  storage: [],
  ram: [],
  availability: [],
  priceMin: null,
  priceMax: null,
};

export type SortKey = "popularity" | "newest" | "price-asc" | "price-desc";

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: "popularity", label: "პოპულარობით" },
  { value: "newest", label: "ახალი დამატებული" },
  { value: "price-asc", label: "ფასი: იაფიდან ძვირისკენ" },
  { value: "price-desc", label: "ფასი: ძვირიდან იაფისკენ" },
];

export function getPriceBounds(products: Product[]): { min: number; max: number } {
  if (products.length === 0) return { min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const p of products) {
    if (p.price < min) min = p.price;
    if (p.price > max) max = p.price;
  }
  return { min: Math.floor(min), max: Math.ceil(max) };
}

function parseLeadingNumber(value: string): number {
  const match = value.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

export function categoryLabelsFromProducts(products: Product[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const product of products) {
    if (product.categoryName) labels[product.category] = product.categoryName;
  }
  return labels;
}

export function getUniqueCategories(products: Product[]): { value: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  const labels = categoryLabelsFromProducts(products);
  for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label: labels[value] ?? value,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function getUniqueBrands(products: Product[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function getUniqueSpecValues(
  products: Product[],
  key: "storage" | "ram"
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    const value = p[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => parseLeadingNumber(a.value) - parseLeadingNumber(b.value));
}

export function applyFilters(products: Product[], filters: CategoryFilterState): Product[] {
  return products.filter((p) => {
    if (filters.categories.length && !filters.categories.includes(p.category)) return false;
    if (filters.brands.length && !filters.brands.includes(p.brand)) return false;
    if (filters.storage.length && (!p.storage || !filters.storage.includes(p.storage))) return false;
    if (filters.ram.length && (!p.ram || !filters.ram.includes(p.ram))) return false;
    if (filters.availability.length && !filters.availability.includes(p.availability)) return false;
    if (filters.priceMin != null && p.price < filters.priceMin) return false;
    if (filters.priceMax != null && p.price > filters.priceMax) return false;
    return true;
  });
}

function popularityScore(product: Product): number {
  return (
    Number(product.isNew) * 100 +
    (product.badge ? 50 : 0) +
    (product.previousPrice ? 10 : 0)
  );
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "newest":
      return list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    case "popularity":
    default:
      return list.sort((a, b) => popularityScore(b) - popularityScore(a) || a.name.localeCompare(b.name, "ka"));
  }
}

export function countActiveFilters(filters: CategoryFilterState): number {
  return (
    filters.categories.length +
    filters.brands.length +
    filters.storage.length +
    filters.ram.length +
    filters.availability.length +
    (filters.priceMin != null ? 1 : 0) +
    (filters.priceMax != null ? 1 : 0)
  );
}
