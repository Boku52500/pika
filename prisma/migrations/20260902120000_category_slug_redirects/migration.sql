-- Permanent redirects for retired Category.slug values (Georgian → Latin).
CREATE TABLE "CategorySlugRedirect" (
    "id" TEXT NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "newSlug" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategorySlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategorySlugRedirect_oldSlug_key" ON "CategorySlugRedirect"("oldSlug");
CREATE INDEX "CategorySlugRedirect_newSlug_idx" ON "CategorySlugRedirect"("newSlug");
CREATE INDEX "CategorySlugRedirect_categoryId_idx" ON "CategorySlugRedirect"("categoryId");

ALTER TABLE "CategorySlugRedirect" ADD CONSTRAINT "CategorySlugRedirect_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
