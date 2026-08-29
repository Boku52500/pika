import type { Prisma } from "@/generated/prisma/client";

export function isStorefrontVisible(product: { isActive: boolean; deletedAt: Date | null }): boolean {
  return product.isActive && product.deletedAt == null;
}

export function storefrontProductWhere(extra: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
  return {
    ...extra,
    isActive: true,
    deletedAt: null,
  };
}
