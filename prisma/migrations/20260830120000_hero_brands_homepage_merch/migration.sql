-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "logoObjectKey" TEXT,
ADD COLUMN "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "homepageSortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Brand_logoObjectKey_key" ON "Brand"("logoObjectKey");

-- CreateIndex
CREATE INDEX "Brand_showOnHomepage_homepageSortOrder_idx" ON "Brand"("showOnHomepage", "homepageSortOrder");

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "homepageSortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Category_showOnHomepage_homepageSortOrder_idx" ON "Category"("showOnHomepage", "homepageSortOrder");

-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "objectKey" TEXT,
    "href" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HeroSlide_objectKey_key" ON "HeroSlide"("objectKey");

-- CreateIndex
CREATE INDEX "HeroSlide_isActive_sortOrder_idx" ON "HeroSlide"("isActive", "sortOrder");
