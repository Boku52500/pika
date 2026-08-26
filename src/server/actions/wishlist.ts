"use server";

import { prisma } from "@/server/db";
import { getSessionCustomer } from "@/server/auth/session";
import { getProductsByIds } from "@/server/catalog/products";
import { toStorefrontProduct } from "@/server/catalog/toStorefrontProduct";
import { AUTH_REQUIRED, GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { logError } from "@/server/log";
import type { Product } from "@/types/product";

export async function listWishlistIds(): Promise<string[]> {
  const customer = await getSessionCustomer();
  if (!customer) return [];
  const rows = await prisma.wishlistItem.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: { productId: true },
  });
  return rows.map((row) => row.productId);
}

export async function listWishlistProducts(): Promise<Product[]> {
  const ids = await listWishlistIds();
  if (ids.length === 0) return [];
  const catalog = await getProductsByIds(ids);
  return catalog.map(toStorefrontProduct);
}

export async function mergeWishlist(productIds: string[]): Promise<ActionResult<{ ids: string[] }>> {
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, message: AUTH_REQUIRED };

  const unique = [...new Set(productIds.filter((id) => typeof id === "string" && id.trim()))].slice(0, 200);
  if (unique.length === 0) {
    return { ok: true, data: { ids: await listWishlistIds() } };
  }

  try {
    const existing = await prisma.product.findMany({
      where: { id: { in: unique }, isActive: true },
      select: { id: true },
    });
    const validIds = existing.map((row) => row.id);
    if (validIds.length > 0) {
      await prisma.wishlistItem.createMany({
        data: validIds.map((productId) => ({ customerId: customer.id, productId })),
        skipDuplicates: true,
      });
    }
    return { ok: true, data: { ids: await listWishlistIds() } };
  } catch (error) {
    logError("wishlist.merge_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function toggleWishlistItem(productId: string): Promise<ActionResult<{ ids: string[]; wished: boolean }>> {
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, message: AUTH_REQUIRED };
  if (!productId) return { ok: false, message: GENERIC_SERVER_ERROR };

  try {
    const existing = await prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId: customer.id, productId } },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { ok: true, data: { ids: await listWishlistIds(), wished: false } };
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) return { ok: false, message: "პროდუქტი ვერ მოიძებნა" };

    await prisma.wishlistItem.create({
      data: { customerId: customer.id, productId: product.id },
    });
    return { ok: true, data: { ids: await listWishlistIds(), wished: true } };
  } catch (error) {
    logError("wishlist.toggle_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function removeWishlistItem(productId: string): Promise<ActionResult<{ ids: string[] }>> {
  const customer = await getSessionCustomer();
  if (!customer) return { ok: false, message: AUTH_REQUIRED };

  try {
    await prisma.wishlistItem.deleteMany({
      where: { customerId: customer.id, productId },
    });
    return { ok: true, data: { ids: await listWishlistIds() } };
  } catch (error) {
    logError("wishlist.remove_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}
