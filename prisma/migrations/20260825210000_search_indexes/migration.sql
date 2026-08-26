-- Storefront search indexes.
-- Product.sku and Product.slug already have unique btree indexes from init.
-- Translation-name btrees help exact/prefix lookups. Candidate retrieval still
-- uses ILIKE '%q%', which does not use btree; pg_trgm GIN indexes are the
-- next step when the catalogue is large enough to justify them. See docs/database.md.

CREATE INDEX "BrandTranslation_name_idx" ON "BrandTranslation"("name");
CREATE INDEX "CategoryTranslation_name_idx" ON "CategoryTranslation"("name");
CREATE INDEX "ProductTranslation_name_idx" ON "ProductTranslation"("name");
