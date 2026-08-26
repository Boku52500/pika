"use client";

import { Trash2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useCart } from "@/hooks/useCart";
import { CartLineCard } from "./CartLineCard";
import { OrderSummary } from "./OrderSummary";
import { EmptyCartState } from "./EmptyCartState";

export function CartPageClient() {
  const { items, count, subtotal, setQuantity, removeItem, clear } = useCart();

  if (items.length === 0) {
    return (
      <Container className="py-6 sm:py-8">
        <Breadcrumbs items={[{ label: "კალათა" }]} className="mb-6" />
        <EmptyCartState />
      </Container>
    );
  }

  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumbs items={[{ label: "კალათა" }]} className="mb-4" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
        <div>
          <h1 className="text-h2 text-text">თქვენი კალათა</h1>
          <p className="text-small tnum mt-1 text-text-faint">{count} პროდუქტი კალათაში</p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-small inline-flex items-center gap-1.5 font-medium text-text-faint transition-colors hover:text-danger-500"
        >
          <Trash2 className="size-4" strokeWidth={1.75} />
          კალათის გასუფთავება
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_23rem] lg:gap-8">
        <div className="flex flex-col gap-4">
          {items.map((line) => (
            <CartLineCard
              key={line.id}
              line={line}
              onQuantityChange={(quantity) => setQuantity(line.id, quantity)}
              onRemove={() => removeItem(line.id)}
            />
          ))}
        </div>

        <OrderSummary subtotal={subtotal} className="lg:sticky lg:top-24" />
      </div>
    </Container>
  );
}
