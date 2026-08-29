"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { CartLineItem } from "@/lib/productSnapshots";

type MiniCartState = {
  open: boolean;
  lastAdded: CartLineItem | null;
};

let state: MiniCartState = { open: false, lastAdded: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return state;
}

function getServerSnapshot(): MiniCartState {
  return { open: false, lastAdded: null };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMiniCart() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const openWithItem = useCallback((item: CartLineItem) => {
    state = { open: true, lastAdded: item };
    emit();
  }, []);

  const close = useCallback(() => {
    if (!state.open) return;
    state = { ...state, open: false };
    emit();
  }, []);

  const toggle = useCallback(() => {
    state = { ...state, open: !state.open };
    emit();
  }, []);

  return {
    open: current.open,
    lastAdded: current.lastAdded,
    openWithItem,
    close,
    toggle,
  };
}
