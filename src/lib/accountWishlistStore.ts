"use client";

const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let ids: string[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

function hydrate(next: string[]) {
  ids = [...new Set(next)];
  notify();
}

function getSnapshot(): string[] {
  return ids;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const accountWishlistStore = { hydrate, getSnapshot, getServerSnapshot, subscribe };
