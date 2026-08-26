"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the mini-cart drawer is open — pure transient UI state (never
 * persisted, always `false` on the server and on the first client render),
 * shared across the header trigger and the drawer itself without prop
 * drilling or a context provider, mirroring the module-singleton pattern
 * used for cart/recent-search data.
 */
let isOpen = false;
const listeners = new Set<() => void>();

function getSnapshot() {
  return isOpen;
}

function getServerSnapshot() {
  return false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setOpen(next: boolean) {
  if (isOpen === next) return;
  isOpen = next;
  listeners.forEach((listener) => listener());
}

export function useCartDrawer() {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  return { open, openDrawer, closeDrawer };
}
