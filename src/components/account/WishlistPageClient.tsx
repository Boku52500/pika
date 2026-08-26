"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { useWishlist } from "@/hooks/useWishlist";
import { listWishlistProducts } from "@/server/actions/wishlist";
import type { Product } from "@/types/product";
import { AccountEmptyState } from "./AccountEmptyState";

export function WishlistPageClient({ initialProducts = [] }: { initialProducts?: Product[] }) {
  const { products: localProducts, ids, isLoggedIn } = useWishlist();
  const [remoteProducts, setRemoteProducts] = useState<Product[]>(initialProducts);
  const idKey = ids.join("|");

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    void listWishlistProducts().then((rows) => {
      if (!cancelled) setRemoteProducts(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, idKey]);

  const products = isLoggedIn ? remoteProducts : localProducts;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h2 text-text">რჩეულები</h1>
        <p className="text-body mt-1 text-text-muted">შენახული პროდუქტები — დაამატეთ კალათაში ან წაშალეთ სიიდან.</p>
      </div>

      {products.length === 0 ? (
        <AccountEmptyState
          icon={Heart}
          title="რჩეულების სია ცარიელია"
          description="დააჭირეთ გულის იკონს პროდუქტზე, რომ შეინახოთ ის აქ შემდგომი შენაძენისთვის."
          secondaryHref="/"
          secondaryLabel="მთავარზე დაბრუნება"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
