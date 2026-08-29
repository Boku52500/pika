import type { Prisma } from "@/generated/prisma/client";

/** Archive payload: hide from the storefront without destroying related rows. */
export function productArchiveData(now = new Date()): Prisma.ProductUpdateInput {
  return {
    deletedAt: now,
    isActive: false,
    isFeatured: false,
    isNew: false,
    featuredSort: null,
    newArrivalSort: null,
  };
}

export function productRestoreData(): Prisma.ProductUpdateInput {
  return {
    deletedAt: null,
    isActive: true,
  };
}

export { isStorefrontVisible, storefrontProductWhere } from "@/server/catalog/visibility";
