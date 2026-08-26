"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * False during SSR and the hydration pass (matches the server snapshot of
 * every local store), true on the real client. Used so auth redirects don't
 * fire against the logged-out server snapshot and bounce a logged-in user.
 */
export function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
