import "server-only";

import { revalidatePath } from "next/cache";

/** Invalidate storefront + admin catalogue views after a mutation. */
export function revalidateCatalogue(opts?: { productSlug?: string; categorySlug?: string; brandSlug?: string }) {
  revalidatePath("/", "layout");
  revalidatePath("/search");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/admin", "layout");
  if (opts?.productSlug) revalidatePath(`/product/${opts.productSlug}`);
  if (opts?.categorySlug) revalidatePath(`/category/${opts.categorySlug}`);
  if (opts?.brandSlug) revalidatePath(`/category/${opts.brandSlug}`);
}

export function revalidateOrders() {
  revalidatePath("/admin/orders", "page");
  revalidatePath("/admin/orders/[id]", "page");
  revalidatePath("/account/orders", "page");
  revalidatePath("/account/orders/[id]", "page");
  revalidatePath("/admin", "page");
}

export function revalidatePromotions() {
  revalidatePath("/admin/promotions", "layout");
  revalidatePath("/checkout");
}
