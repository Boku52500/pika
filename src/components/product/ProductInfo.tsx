import Link from "next/link";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { availabilityLabel } from "@/lib/productLabels";
import { ProductBadge, NewBadge } from "./ProductBadge";
import { ProductRating } from "./ProductRating";

/** Brand / title / rating / SKU / availability block — top of the PDP right column. */
export function ProductInfo({
  product,
  sku,
  shortDescription,
  className,
}: {
  product: Product;
  sku: string;
  shortDescription?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {product.isNew || product.badge ? (
        <div className="flex flex-wrap items-center gap-2">
          {product.isNew ? <NewBadge /> : null}
          {product.badge ? <ProductBadge badge={product.badge} /> : null}
        </div>
      ) : null}

      <div>
        <Link
          href={`/category/${product.category}`}
          className="text-label text-brand-600 transition-colors hover:text-brand-700"
        >
          {product.brand}
        </Link>
        <h1 className="text-h2 mt-1 text-text lg:text-[1.75rem]">{product.name}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <a href="#reviews" className="transition-opacity hover:opacity-80">
          <ProductRating rating={product.rating} reviewCount={product.reviewCount} size="md" />
        </a>
        <span className="text-border-strong" aria-hidden>
          ·
        </span>
        <span className="text-small text-text-muted">
          კოდი: <span className="tnum font-medium text-text">{sku}</span>
        </span>
      </div>

      <span
        className={cn(
          "text-small inline-flex w-fit items-center gap-1.5 font-medium",
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

      {shortDescription ? <p className="text-body max-w-prose text-text-muted">{shortDescription}</p> : null}
    </div>
  );
}
