-- Archive products instead of hard-deleting them so OrderItem snapshots stay intact.
ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");
CREATE INDEX "Product_isActive_deletedAt_idx" ON "Product"("isActive", "deletedAt");

-- Admin-controlled single-line storefront navbar.
ALTER TABLE "Category" ADD COLUMN "showInMainNav" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN "navSortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Category_showInMainNav_navSortOrder_idx" ON "Category"("showInMainNav", "navSortOrder");

-- Keep showInMainNav false. The one-line navbar is an admin choice, not
-- "every top-level category". Production must not auto-enable a full set
-- that clips labels. Admins pick visibility and order after migrate.

-- Reusable specification value library.
CREATE TABLE "SpecificationValue" (
    "id" TEXT NOT NULL,
    "specificationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpecificationValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpecificationValueTranslation" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SpecificationValueTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpecificationValue_specificationId_slug_key" ON "SpecificationValue"("specificationId", "slug");
CREATE INDEX "SpecificationValue_specificationId_sortOrder_idx" ON "SpecificationValue"("specificationId", "sortOrder");
CREATE UNIQUE INDEX "SpecificationValueTranslation_valueId_locale_key" ON "SpecificationValueTranslation"("valueId", "locale");

ALTER TABLE "SpecificationValue" ADD CONSTRAINT "SpecificationValue_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES "SpecificationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpecificationValueTranslation" ADD CONSTRAINT "SpecificationValueTranslation_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "SpecificationValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSpecification" ADD COLUMN "valueId" TEXT;
CREATE INDEX "ProductSpecification_valueId_idx" ON "ProductSpecification"("valueId");

-- Catch-all specification group for admin-created definitions that have no dedicated group.
INSERT INTO "SpecificationGroup" ("id", "slug", "sortOrder")
SELECT 'specgroup_general', 'general', 999
WHERE NOT EXISTS (SELECT 1 FROM "SpecificationGroup" WHERE "slug" = 'general');

INSERT INTO "SpecificationGroupTranslation" ("id", "groupId", "locale", "name")
SELECT 'specgroup_general_ka', g."id", 'ka', 'სხვა'
FROM "SpecificationGroup" g
WHERE g."slug" = 'general'
  AND NOT EXISTS (
    SELECT 1 FROM "SpecificationGroupTranslation" t
    WHERE t."groupId" = g."id" AND t."locale" = 'ka'
  );

-- Backfill reusable values from existing product specification strings.
INSERT INTO "SpecificationValue" ("id", "specificationId", "slug", "sortOrder")
SELECT
  'sv_' || md5(src."specificationId" || E'\x1f' || src."normalized"),
  src."specificationId",
  src."slug",
  0
FROM (
  SELECT DISTINCT ON (ps."specificationId", lower(trim(both from regexp_replace(ps."value", '\s+', ' ', 'g'))))
    ps."specificationId",
    lower(trim(both from regexp_replace(ps."value", '\s+', ' ', 'g'))) AS "normalized",
    COALESCE(
      NULLIF(
        trim(both '-' from regexp_replace(
          lower(trim(both from regexp_replace(ps."value", '\s+', ' ', 'g'))),
          '[^a-z0-9ა-ჰ]+',
          '-',
          'g'
        )),
        ''
      ),
      'v-' || md5(lower(trim(ps."value")))
    ) AS "slug",
    trim(ps."value") AS "name"
  FROM "ProductSpecification" ps
  WHERE trim(ps."value") <> ''
  ORDER BY ps."specificationId", lower(trim(both from regexp_replace(ps."value", '\s+', ' ', 'g'))), ps."id"
) src
ON CONFLICT ("specificationId", "slug") DO NOTHING;

INSERT INTO "SpecificationValueTranslation" ("id", "valueId", "locale", "name")
SELECT
  'svt_' || md5(v."id" || ':ka'),
  v."id",
  'ka',
  src."name"
FROM "SpecificationValue" v
INNER JOIN (
  SELECT DISTINCT ON (ps."specificationId", lower(trim(both from regexp_replace(ps."value", '\s+', ' ', 'g'))))
    ps."specificationId",
    lower(trim(both from regexp_replace(ps."value", '\s+', ' ', 'g'))) AS "normalized",
    trim(ps."value") AS "name"
  FROM "ProductSpecification" ps
  WHERE trim(ps."value") <> ''
  ORDER BY ps."specificationId", lower(trim(both from regexp_replace(ps."value", '\s+', ' ', 'g'))), ps."id"
) src
  ON src."specificationId" = v."specificationId"
 AND v."id" = 'sv_' || md5(src."specificationId" || E'\x1f' || src."normalized")
ON CONFLICT ("valueId", "locale") DO NOTHING;

UPDATE "ProductSpecification" ps
SET "valueId" = v."id"
FROM "SpecificationValue" v
WHERE v."id" = 'sv_' || md5(ps."specificationId" || E'\x1f' || lower(trim(both from regexp_replace(ps."value", '\s+', ' ', 'g'))))
  AND ps."valueId" IS NULL
  AND trim(ps."value") <> '';

ALTER TABLE "ProductSpecification"
  ADD CONSTRAINT "ProductSpecification_valueId_fkey"
  FOREIGN KEY ("valueId") REFERENCES "SpecificationValue"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
