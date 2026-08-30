"use client";

import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/types/product";

/**
 * Primary PDP CTA: add the selected product/quantity/variants to the shared
 * cart store, then go to checkout. Availability is the storefront's manual
 * `availability` flag — numeric stock is not used.
 */
export function BuyNowButton({
  product,
  quantity = 1,
  variants,
  disabled = false,
  className,
}: {
  product: Product;
  quantity?: number;
  variants?: Record<string, string>;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const productName = product.name;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={disabled}
        aria-label={disabled ? `${productName} — არ არის ხელმისაწვდომი` : `${productName} — ახლავე ყიდვა`}
        onClick={() => {
          if (disabled) return;
          addItem(product, quantity, variants);
          router.push("/checkout");
        }}
        className="w-full gap-2"
      >
        <Zap className="size-[18px]" strokeWidth={2} />
        ახლავე ყიდვა
      </Button>
    </div>
  );
}
