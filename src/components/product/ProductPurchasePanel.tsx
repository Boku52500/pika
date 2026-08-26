"use client";

import { useState } from "react";
import type { Product, ProductVariantGroup } from "@/types/product";
import { getDefaultVariants } from "@/lib/cart";
import { ProductActions } from "./ProductActions";
import { StickyMobileBuyBar } from "./StickyMobileBuyBar";

/**
 * Owns the PDP's quantity + variant-selection state and shares it between
 * the main purchase column (`ProductActions`) and the mobile sticky buy bar
 * rendered lower in the page — both need the *same* current selection when
 * the customer taps "დამატება", so this state can't live inside either one
 * alone. `StickyMobileBuyBar` is `position: fixed`, so rendering it here
 * (instead of at the bottom of the page) doesn't change where it visually
 * appears.
 */
export function ProductPurchasePanel({
  product,
  variants,
  sentinelId,
}: {
  product: Product;
  variants: ProductVariantGroup[];
  sentinelId: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() =>
    getDefaultVariants(product)
  );

  return (
    <>
      <ProductActions
        product={product}
        variants={variants}
        quantity={quantity}
        onQuantityChange={setQuantity}
        selectedVariants={selectedVariants}
        onVariantChange={(groupId, value) => setSelectedVariants((prev) => ({ ...prev, [groupId]: value }))}
      />
      <StickyMobileBuyBar product={product} quantity={quantity} variants={selectedVariants} sentinelId={sentinelId} />
    </>
  );
}
