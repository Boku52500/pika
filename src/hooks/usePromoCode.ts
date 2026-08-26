"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { promoStore } from "@/lib/promoStore";
import { evaluatePromoCode, type PromoCodeResult } from "@/lib/cart";

/**
 * Reads/writes the single applied promo code and evaluates it against the
 * given subtotal via the one `evaluatePromoCode` function — every surface
 * (cart page, checkout summary) that calls this hook always sees the same
 * applied code and the same computed discount.
 */
export function usePromoCode(subtotal: number) {
  const code = useSyncExternalStore(promoStore.subscribe, promoStore.getSnapshot, promoStore.getServerSnapshot);

  const result = useMemo<PromoCodeResult | null>(() => (code ? evaluatePromoCode(code, subtotal) : null), [code, subtotal]);

  const applyCode = useCallback((raw: string) => promoStore.setCode(raw), []);
  const removeCode = useCallback(() => promoStore.clear(), []);

  return { code, result, applyCode, removeCode };
}
