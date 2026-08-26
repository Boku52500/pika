"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { Product } from "@/types/product";
import { wishlistSnapshotToProduct } from "@/lib/productSnapshots";
import { wishlistStore } from "@/lib/wishlistStore";
import { accountWishlistStore } from "@/lib/accountWishlistStore";
import { syncLoggedInWishlist } from "@/lib/wishlistSync";
import { removeWishlistItem, toggleWishlistItem } from "@/server/actions/wishlist";
import { useAuth } from "./useAuth";

/**
 * Guest wishlists stay in localStorage. Signed-in wishlists use PostgreSQL.
 * Logging in merges guest ids into the account (unique constraint, no duplicates)
 * and then clears the local guest list.
 */
export function useWishlist() {
  const { customer, isLoggedIn } = useAuth();
  const localItems = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getSnapshot, wishlistStore.getServerSnapshot);
  const remoteIds = useSyncExternalStore(
    accountWishlistStore.subscribe,
    accountWishlistStore.getSnapshot,
    accountWishlistStore.getServerSnapshot,
  );

  useEffect(() => {
    if (isLoggedIn && customer) {
      void syncLoggedInWishlist(customer.id);
    }
  }, [isLoggedIn, customer]);

  const ids = isLoggedIn ? remoteIds : localItems.map((item) => item.productId);
  const idSet = useMemo(() => new Set(ids), [ids]);
  const products = useMemo<Product[]>(() => localItems.map(wishlistSnapshotToProduct), [localItems]);

  const isWishlisted = useCallback((productId: string) => idSet.has(productId), [idSet]);

  const add = useCallback(
    (product: Product) => {
      if (!product?.id) return;
      if (isLoggedIn) {
        if (idSet.has(product.id)) return;
        void toggleWishlistItem(product.id).then((result) => {
          if (result.ok) accountWishlistStore.hydrate(result.data.ids);
        });
        return;
      }
      wishlistStore.add(product);
    },
    [isLoggedIn, idSet],
  );

  const remove = useCallback(
    (productId: string) => {
      if (isLoggedIn) {
        void removeWishlistItem(productId).then((result) => {
          if (result.ok) accountWishlistStore.hydrate(result.data.ids);
        });
        return;
      }
      wishlistStore.remove(productId);
    },
    [isLoggedIn],
  );

  const toggle = useCallback(
    (product: Product) => {
      if (!product?.id) return;
      if (isLoggedIn) {
        void toggleWishlistItem(product.id).then((result) => {
          if (result.ok) accountWishlistStore.hydrate(result.data.ids);
        });
        return;
      }
      wishlistStore.toggle(product);
    },
    [isLoggedIn],
  );

  return { ids, count: ids.length, products, isWishlisted, add, remove, toggle, isLoggedIn };
}
