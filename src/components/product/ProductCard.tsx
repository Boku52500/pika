import Link from "next/link";
import type { Product } from "@/types/product";
import { cn, getDiscountPercent } from "@/lib/utils";
import { availabilityLabel } from "@/lib/productLabels";
import { getDefaultVariants } from "@/lib/cart";
import { ProductImage } from "./ProductImage";
import { ProductRating } from "./ProductRating";
import { ProductPrice } from "./ProductPrice";
import { WishlistButton } from "./WishlistButton";
import { AddToCartButton } from "./AddToCartButton";
import { ProductBadge, DiscountBadge, NewBadge } from "./ProductBadge";

export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const discount = getDiscountPercent(product.price, product.previousPrice);
  const outOfStock = product.availability === "out-of-stock";
  const href = `/product/${product.slug}`;
  const primaryPhoto = product.images?.find((image) => image.src);
  const hoverPhoto = product.images?.find((image) => image.src && image.src !== primaryPhoto?.src);

  return (
    <div
      className={cn(
        "group flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
        className
      )}
    >
      <div className="relative p-3 pb-0">
        {/*
          The image link is hidden from keyboard/screen-reader navigation
          (tabIndex -1, aria-hidden) because the title link below points to
          the same destination — this avoids two identical tab stops per
          card while mouse users can still click the photo.
        */}
        <Link href={href} tabIndex={-1} aria-hidden className="block">
          <ProductImage
            visual={product.visual}
            tone={product.tone}
            hoverVisual={product.secondaryVisual}
            src={primaryPhoto?.src}
            alt={primaryPhoto?.alt || product.name}
            hoverSrc={hoverPhoto?.src}
            className="transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        <div className="pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-1.5">
          {discount ? <DiscountBadge percent={discount} /> : null}
          {product.isNew ? <NewBadge /> : null}
          {product.badge ? <ProductBadge badge={product.badge} /> : null}
        </div>

        <WishlistButton product={product} className="absolute right-4 top-4" />

        {outOfStock ? (
          <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-[var(--radius-md)] bg-white/70 backdrop-saturate-150">
            <span className="text-label rounded-[var(--radius-xs)] bg-ink-900 px-2.5 py-1 text-white">
              არ არის მარაგში
            </span>
          </div>
        ) : null}
      </div>

      <Link href={href} className="flex flex-col gap-1.5 p-4 pb-0 pt-3">
        <span className="text-label text-text-faint">{product.brand}</span>
        <h3 className="text-body line-clamp-2 min-h-[2.75rem] font-semibold leading-snug text-text">
          {product.name}
        </h3>

        <ProductRating rating={product.rating} reviewCount={product.reviewCount} />

        <ProductPrice
          price={product.price}
          previousPrice={product.previousPrice}
          installment={product.installment}
          className="mt-1"
        />
      </Link>

      <div className="mt-auto flex flex-col gap-2.5 p-4 pt-3">
        <span
          className={cn(
            "text-small inline-flex items-center gap-1.5 font-medium",
            product.availability === "in-stock" && "text-success-600",
            product.availability === "low-stock" && "text-warning-500",
            product.availability === "out-of-stock" && "text-text-faint"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              product.availability === "in-stock" && "bg-success-500",
              product.availability === "low-stock" && "bg-warning-500",
              product.availability === "out-of-stock" && "bg-text-faint"
            )}
          />
          {availabilityLabel[product.availability]}
        </span>

        <AddToCartButton product={product} variants={getDefaultVariants(product)} disabled={outOfStock} />
      </div>
    </div>
  );
}
