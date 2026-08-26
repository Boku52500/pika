"use client";

import type { Product, ProductVariantGroup } from "@/types/product";
import { QuantitySelector } from "./QuantitySelector";
import { ProductVariants } from "./ProductVariants";
import { BuyNowButton } from "./BuyNowButton";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";
import { CompareButton } from "./CompareButton";
import { ProductTrustInfo } from "./ProductTrustInfo";

/**
 * The PDP purchase area: variants, quantity, then CTAs in the required
 * hierarchy (1. Buy now, 2. Add to cart, 3. Wishlist / Compare), plus a
 * subtle trust-info row. Out-of-stock disables every purchase control while
 * keeping wishlist/compare available.
 *
 * Quantity and variant selection are owned by `ProductPurchasePanel` (the
 * client wrapper rendered by the PDP page) so the same selection can also
 * reach the mobile sticky buy bar rendered alongside it.
 */
export function ProductActions({
  product,
  variants,
  quantity,
  onQuantityChange,
  selectedVariants,
  onVariantChange,
}: {
  product: Product;
  variants: ProductVariantGroup[];
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  selectedVariants: Record<string, string>;
  onVariantChange: (groupId: string, value: string) => void;
}) {
  const outOfStock = product.availability === "out-of-stock";

  return (
    <div className="flex flex-col gap-5">
      <ProductVariants groups={variants} selected={selectedVariants} onChange={onVariantChange} />

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-small font-medium text-text">რაოდენობა</span>
        <QuantitySelector value={quantity} onChange={onQuantityChange} disabled={outOfStock} max={10} />
      </div>

      <div className="flex flex-col gap-2.5">
        <BuyNowButton productName={product.name} disabled={outOfStock} />
        <AddToCartButton
          product={product}
          quantity={quantity}
          variants={selectedVariants}
          disabled={outOfStock}
          size="lg"
          variant="outline"
        />
      </div>

      <div className="flex gap-2.5">
        <WishlistButton product={product} labeled className="flex-1" />
        <CompareButton productName={product.name} className="flex-1" />
      </div>

      <ProductTrustInfo className="border-t border-border pt-4" />
    </div>
  );
}
