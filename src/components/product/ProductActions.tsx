"use client";

import type { Product, ProductVariantGroup } from "@/types/product";
import { QuantitySelector } from "./QuantitySelector";
import { ProductVariants } from "./ProductVariants";
import { BuyNowButton } from "./BuyNowButton";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";
import { ProductTrustInfo } from "./ProductTrustInfo";

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

      <WishlistButton product={product} labeled className="w-full" />

      <ProductTrustInfo className="border-t border-border pt-4" />
    </div>
  );
}
