-- Inventory hold/release, card promo reservation until PAID, durable checkout idempotency.

CREATE TYPE "InventoryHoldState" AS ENUM ('held', 'committed', 'released');
CREATE TYPE "PromotionRedemptionStatus" AS ENUM ('held', 'consumed', 'released');

ALTER TABLE "Order" ADD COLUMN "checkoutIdempotencyKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "inventoryState" "InventoryHoldState" NOT NULL DEFAULT 'committed';

CREATE UNIQUE INDEX "Order_checkoutIdempotencyKey_key" ON "Order"("checkoutIdempotencyKey");

ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PromotionRedemption" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "PromotionRedemptionStatus" NOT NULL DEFAULT 'held',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromotionRedemption_orderId_key" ON "PromotionRedemption"("orderId");
CREATE INDEX "PromotionRedemption_promotionId_status_idx" ON "PromotionRedemption"("promotionId", "status");

ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
