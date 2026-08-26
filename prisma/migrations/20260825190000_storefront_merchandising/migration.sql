-- Storefront merchandising fields used by homepage sections, PLP filters, and PDP copy.
-- Homepage featured/new-arrival order cannot be inferred from isFeatured/isNew alone
-- (isNew also marks catalogue items that are not in the homepage new-arrivals row).

ALTER TABLE "Product" ADD COLUMN "featuredSort" INTEGER;
ALTER TABLE "Product" ADD COLUMN "newArrivalSort" INTEGER;
ALTER TABLE "Product" ADD COLUMN "badgeKind" TEXT;
ALTER TABLE "Product" ADD COLUMN "badgeLabel" TEXT;
ALTER TABLE "Product" ADD COLUMN "stockStatus" TEXT NOT NULL DEFAULT 'in-stock';
ALTER TABLE "Product" ADD COLUMN "storageLabel" TEXT;
ALTER TABLE "Product" ADD COLUMN "ramLabel" TEXT;

ALTER TABLE "ProductTranslation" ADD COLUMN "warranty" TEXT;

CREATE INDEX "Product_isActive_isFeatured_featuredSort_idx" ON "Product"("isActive", "isFeatured", "featuredSort");
CREATE INDEX "Product_isActive_isNew_newArrivalSort_idx" ON "Product"("isActive", "isNew", "newArrivalSort");
