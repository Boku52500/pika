import "server-only";

export { getBrands, getBrandBySlug } from "@/server/catalog/brands";
export { getCategories, getCategoryBySlug } from "@/server/catalog/categories";
export {
  getProductBySlug,
  getProductById,
  getProductsByIds,
  getProducts,
  getProductsByCategory,
  getRelatedProducts,
  getRecommendedProducts,
} from "@/server/catalog/products";
export {
  getHomepageFeaturedProducts,
  getHomepageNewArrivals,
  getStorefrontProductBySlug,
  loadStorefrontCategoryPage,
  loadStorefrontProductPage,
} from "@/server/catalog/storefront";
export { toStorefrontCategory, toStorefrontProduct } from "@/server/catalog/toStorefrontProduct";
export { CatalogueUnavailableError } from "@/server/catalog/errors";
export type {
  CatalogBrand,
  CatalogCategory,
  CatalogProduct,
  CatalogProductVariant,
  ProductListFilters,
} from "@/server/catalog/types";
