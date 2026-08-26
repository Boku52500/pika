"use client";

import { listWishlistIds, mergeWishlist } from "@/server/actions/wishlist";
import { accountWishlistStore } from "@/lib/accountWishlistStore";
import { wishlistStore } from "@/lib/wishlistStore";

let syncedUserId: string | null = null;
let inFlight: Promise<void> | null = null;

export function resetWishlistSync() {
  syncedUserId = null;
  inFlight = null;
  accountWishlistStore.hydrate([]);
}

/** Merge guest localStorage ids into the account wishlist once per session user. */
export function syncLoggedInWishlist(userId: string): Promise<void> {
  if (syncedUserId === userId && !inFlight) return Promise.resolve();
  if (inFlight && syncedUserId === userId) return inFlight;

  syncedUserId = userId;
  inFlight = (async () => {
    const localIds = wishlistStore.getSnapshot().map((item) => item.productId);
    if (localIds.length > 0) {
      await mergeWishlist(localIds);
      wishlistStore.clear();
    }
    const ids = await listWishlistIds();
    accountWishlistStore.hydrate(ids);
  })()
    .catch((error) => {
      console.error("wishlist sync failed", error);
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
