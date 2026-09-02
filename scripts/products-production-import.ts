/**
 * ONE-TIME PRODUCTION import of the approved 458-product AI catalogue into Neon.
 *
 * - Loads `.env.production.local` only (Vercel production pull)
 * - Connects via Neon WebSocket (port 443) — TCP 5432 is blocked from this host
 * - Asserts Neon before any write
 * - CREATE missing Excel SKUs; UPDATE the 3 existing approved SKUs
 * - Idempotent by SKU identity
 * - No seed / migrate / delete / reset
 *
 * Usage:
 *   npx vercel env pull .env.production.local --environment=production --yes
 *   npm run products:production-import -- "C:\\path\\products.xlsx"
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

import type { AiSeoManifest, AiSeoManifestEntry } from "../src/lib/productImport/aiSeoManifest";
import { parseAllExcelProducts, type ExcelProductRow } from "../src/lib/productImport/excelProducts";
import { catalogIdentityKey } from "../src/lib/productImport/slug";
import type { PlannedProduct, RowIssue } from "../src/lib/productImport/types";
import { parseMoneyInput } from "../src/server/money";

const PHILIPS_DUPLICATE_REVIEW = ["172492", "177053"] as const;
const APPROVED_UPDATE_SKUS = new Set(["176309", "173536", "173534"]);
const MANIFEST_PATH = path.join(process.cwd(), "tmp", "product-seo-ai-review.json");
const DRY_RUN_PATH = path.join(process.cwd(), "tmp", "product-production-import-dry-run.json");
const OUT_PATH = path.join(process.cwd(), "tmp", "product-production-import-report.json");
const PROD_ENV_PATH = path.join(process.cwd(), ".env.production.local");

type DryRunSummary = {
  actionCounts?: { CREATE?: number; ALREADY_EXISTS_DIFFERENT?: number };
  categoriesToCreate?: string[];
  brandsToCreate?: string[];
  categoriesToReuse?: string[];
  brandsToReuse?: string[];
  inventoryBefore?: { products?: number };
};

function loadProductionEnv(): string {
  if (!fs.existsSync(PROD_ENV_PATH)) {
    throw new Error(
      "Missing .env.production.local. Pull production env first:\n" +
        "  npx vercel env pull .env.production.local --environment=production --yes",
    );
  }
  const parsed = dotenv.parse(fs.readFileSync(PROD_ENV_PATH));
  const databaseUrl = parsed.DATABASE_URL ?? "";
  if (!databaseUrl || databaseUrl === "[SENSITIVE]") {
    throw new Error("Production DATABASE_URL missing or redacted");
  }
  // Prefer production URL; do not let later dotenv override if already set.
  process.env.DATABASE_URL = databaseUrl;
  for (const [k, v] of Object.entries(parsed)) {
    if (v && v !== "[SENSITIVE]" && process.env[k] === undefined) process.env[k] = v;
  }
  return databaseUrl;
}

function assertNeonProduction(databaseUrl: string): {
  provider: "Neon";
  sanitizedHost: string;
  database: string;
  sslmode: string | null;
} {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;
  const database = (parsed.pathname || "/").replace(/^\//, "").split("?")[0] ?? "";
  const isNeon = /neon\.tech$/i.test(host);
  const isLocal = ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host);
  if (!isNeon || isLocal) {
    throw new Error("REFUSING WRITE: DATABASE_URL is not production Neon");
  }
  const parts = host.split(".");
  const sanitizedHost = parts.length >= 4 ? `*.${parts.slice(-4).join(".")}` : `*.neon.tech`;
  return {
    provider: "Neon",
    sanitizedHost,
    database,
    sslmode: parsed.searchParams.get("sslmode"),
  };
}

function toPlanned(
  row: ExcelProductRow,
  entry: AiSeoManifestEntry,
  categoryExists: boolean,
  brandExists: boolean,
): PlannedProduct {
  return {
    excelRowNumber: row.excelRowNumber,
    sku: row.sku,
    name: row.name,
    category: row.category,
    categoryExcel: row.categoryExcel !== row.category ? row.categoryExcel : undefined,
    categoryAliasApplied: row.categoryExcel !== row.category,
    categoryExists,
    brand: row.brand,
    brandExists,
    price: row.price,
    slug: entry.finalValidatedSlug,
    shortDescription: entry.aiShortDescription,
    fullDescription: entry.aiFullDescription,
    seoTitle: entry.aiSeoTitle,
    seoDescription: entry.aiSeoDescription,
    status: "READY",
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv.find((a) => a && !a.startsWith("--"));
  if (!fileArg) {
    console.error('Usage: npm run products:production-import -- "C:\\path\\products.xlsx"');
    process.exit(1);
  }

  console.log("\n=== PRODUCTION CATALOGUE IMPORT (AUTHORIZED) ===\n");
  console.log("No seed / migrate / reset / delete of existing catalogue.");
  console.log("Transport: Neon WebSocket Prisma adapter.\n");

  const databaseUrl = loadProductionEnv();
  const target = assertNeonProduction(databaseUrl);
  console.log("Production connection (sanitized):");
  console.log(`  provider: ${target.provider}`);
  console.log(`  host: ${target.sanitizedHost}`);
  console.log(`  database: ${target.database}`);
  console.log(`  sslmode: ${target.sslmode ?? "(n/a)"}`);
  console.log("  confirmed: production Neon\n");

  neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon({ connectionString: databaseUrl });
  const neonPrisma = new PrismaClient({ adapter });
  // Inject before local import helpers load `@/server/prisma`.
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = neonPrisma;

  const {
    executeProductImport,
    loadPlanImportContext,
    updateExistingProductAiContent,
  } = await import("../src/server/import/productImportDb");
  const { prisma } = await import("../src/server/prisma");

  if (prisma !== neonPrisma) {
    throw new Error("Prisma singleton was not the Neon client — refusing write");
  }

  await prisma.$queryRaw`SELECT 1`;

  const excelRows = parseAllExcelProducts(path.resolve(fileArg));
  const manifest = JSON.parse(await fsp.readFile(MANIFEST_PATH, "utf8")) as AiSeoManifest;
  const dryRun = JSON.parse(await fsp.readFile(DRY_RUN_PATH, "utf8")) as DryRunSummary;

  if (excelRows.length !== 458) throw new Error(`Expected 458 Excel rows, got ${excelRows.length}`);
  if (manifest.entries.length !== 458) {
    throw new Error(`Expected 458 manifest entries, got ${manifest.entries.length}`);
  }
  if (dryRun.actionCounts?.CREATE !== 455 || dryRun.actionCounts?.ALREADY_EXISTS_DIFFERENT !== 3) {
    throw new Error(
      `Dry-run action counts mismatch: CREATE=${dryRun.actionCounts?.CREATE} DIFFERENT=${dryRun.actionCounts?.ALREADY_EXISTS_DIFFERENT}`,
    );
  }

  const bySku = new Map(manifest.entries.map((e) => [e.sku, e]));
  for (const row of excelRows) {
    if (!bySku.has(row.sku)) throw new Error(`Manifest missing Excel SKU ${row.sku}`);
  }

  const beforeCount = await prisma.product.count();
  const context = await loadPlanImportContext();

  const toCreate: PlannedProduct[] = [];
  const toUpdate: Array<{ row: ExcelProductRow; entry: AiSeoManifestEntry }> = [];

  for (const row of excelRows) {
    const entry = bySku.get(row.sku)!;
    if (entry.generationStatus === "failed") {
      throw new Error(`Failed manifest entry for SKU ${row.sku}`);
    }
    if (context.existingSkus.has(row.sku)) {
      toUpdate.push({ row, entry });
    } else {
      toCreate.push(
        toPlanned(
          row,
          entry,
          context.existingCategories.has(catalogIdentityKey(row.category)),
          context.existingBrands.has(catalogIdentityKey(row.brand)),
        ),
      );
    }
  }

  // First run expectation from approved dry-run; re-runs become all-update (idempotent).
  const expectedFirstRun = beforeCount === (dryRun.inventoryBefore?.products ?? 58);
  const verifyOnly = argv.includes("--verify-only");
  if (expectedFirstRun) {
    if (toCreate.length !== 455 || toUpdate.length !== 3) {
      throw new Error(
        `Unexpected plan vs dry-run on first run: create=${toCreate.length} update=${toUpdate.length}`,
      );
    }
    for (const { row } of toUpdate) {
      if (!APPROVED_UPDATE_SKUS.has(row.sku)) {
        throw new Error(`Unexpected update SKU ${row.sku} (not in approved update set)`);
      }
    }
  }

  console.log(`Products before import: ${beforeCount}`);
  console.log(`To CREATE: ${toCreate.length}`);
  console.log(`To UPDATE: ${toUpdate.length}`);
  console.log(`Mode: ${verifyOnly ? "VERIFY_ONLY" : "WRITE"}`);
  console.log(`Philips INVENTORY_DUPLICATE_REVIEW: ${PHILIPS_DUPLICATE_REVIEW.join(", ")}`);

  const started = Date.now();
  const failed: RowIssue[] = [];
  let createdIds: string[] = [];
  let createdCategories: string[] = [];
  let createdBrands: string[] = [];
  const updatedIds: string[] = [];
  let slugChanges = 0;
  let writesPerformed = false;

  // On verify-only after a successful write, treat current DB state as the import outcome.
  if (verifyOnly) {
    if (toCreate.length !== 0) {
      throw new Error(`--verify-only refused: ${toCreate.length} Excel SKUs still missing from production`);
    }
    createdIds = []; // unknown IDs; counts come from dry-run expectation below
    for (const { row } of toUpdate) {
      const existing = context.existingSkus.get(row.sku);
      if (existing) updatedIds.push(existing.productId);
    }
  }

  if (!verifyOnly && toCreate.length) {
    console.log(`\nCreating ${toCreate.length} product(s)...`);
    const batchSize = 25;
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);
      const result = await executeProductImport(batch);
      createdIds.push(...result.createdProductIds);
      for (const c of result.createdCategories) createdCategories.push(c);
      for (const b of result.createdBrands) createdBrands.push(b);
      failed.push(...result.failed);
      console.log(
        `  create progress ${Math.min(i + batch.length, toCreate.length)}/${toCreate.length} (ok=${createdIds.length} fail=${failed.length})`,
      );
    }
    createdCategories = [...new Set(createdCategories)].sort((a, b) => a.localeCompare(b, "ka"));
    createdBrands = [...new Set(createdBrands)].sort((a, b) => a.localeCompare(b, "ka"));
  }

  if (!verifyOnly && toUpdate.length) {
    console.log(`\nUpdating ${toUpdate.length} existing Excel SKU(s)...`);
    for (const { row, entry } of toUpdate) {
      const result = await updateExistingProductAiContent({
        sku: row.sku,
        excelRowNumber: row.excelRowNumber,
        name: row.name,
        price: row.price,
        slug: entry.finalValidatedSlug,
        shortDescription: entry.aiShortDescription,
        fullDescription: entry.aiFullDescription,
        seoTitle: entry.aiSeoTitle,
        seoDescription: entry.aiSeoDescription,
        syncExcelNameAndPrice: true,
      });
      if (result.ok) {
        updatedIds.push(result.id);
        if (result.slugChanged) slugChanges += 1;
      } else {
        failed.push(result.issue);
      }
    }
    writesPerformed = true;
  } else if (!verifyOnly) {
    writesPerformed = toCreate.length > 0;
  }

  if (!verifyOnly && toCreate.length) writesPerformed = true;

  // -------------------------------------------------------------------------
  // Post-import verification against Neon
  // -------------------------------------------------------------------------
  console.log("\n=== Post-import Neon verification ===\n");
  const afterCount = await prisma.product.count();
  const excelSkus = excelRows.map((r) => r.sku);
  const dbProducts = await prisma.product.findMany({
    where: { sku: { in: excelSkus } },
    select: {
      id: true,
      sku: true,
      slug: true,
      price: true,
      previousPrice: true,
      stockQuantity: true,
      isActive: true,
      deletedAt: true,
      reviewCount: true,
      ratingAverage: true,
      translations: {
        where: { locale: "ka" },
        select: {
          name: true,
          shortDescription: true,
          description: true,
          seoTitle: true,
          seoDescription: true,
        },
      },
      brand: { select: { translations: { where: { locale: "ka" }, select: { name: true } } } },
      category: { select: { translations: { where: { locale: "ka" }, select: { name: true } } } },
      _count: {
        select: {
          variants: true,
          images: true,
          specifications: true,
          reviews: true,
          relations: true,
        },
      },
    },
  });

  const byDbSku = new Map(dbProducts.map((p) => [p.sku, p]));
  const missingInDb = excelSkus.filter((sku) => !byDbSku.has(sku));
  const skuDupCheck = await prisma.$queryRaw<Array<{ sku: string; c: bigint }>>`
    SELECT sku, COUNT(*)::bigint AS c FROM "Product" GROUP BY sku HAVING COUNT(*) > 1
  `;
  const slugDupCheck = await prisma.$queryRaw<Array<{ slug: string; c: bigint }>>`
    SELECT slug, COUNT(*)::bigint AS c FROM "Product" GROUP BY slug HAVING COUNT(*) > 1
  `;

  const mismatches: Array<{ sku: string; field: string; expected: string; actual: string }> = [];
  for (const row of excelRows) {
    const entry = bySku.get(row.sku)!;
    const db = byDbSku.get(row.sku);
    if (!db) continue;
    const t = db.translations[0];
    const checks: Array<[string, string, string | null | undefined]> = [
      ["name", row.name, t?.name],
      ["price", parseMoneyInput(row.price).toString(), db.price.toString()],
      ["shortDescription", entry.aiShortDescription, t?.shortDescription],
      ["fullDescription", entry.aiFullDescription, t?.description],
      ["seoTitle", entry.aiSeoTitle, t?.seoTitle],
      ["seoDescription", entry.aiSeoDescription, t?.seoDescription],
      ["slug", entry.finalValidatedSlug, db.slug],
    ];
    for (const [field, expected, actual] of checks) {
      if ((actual ?? "") !== expected) {
        if (field === "slug" && (actual ?? "").startsWith(expected) && (actual ?? "").endsWith(row.sku)) {
          continue;
        }
        mismatches.push({
          sku: row.sku,
          field,
          expected: expected.slice(0, 120),
          actual: (actual ?? "").slice(0, 120),
        });
      }
    }
    const dbCat = db.category.translations[0]?.name ?? "";
    if (catalogIdentityKey(dbCat) !== catalogIdentityKey(row.category)) {
      mismatches.push({ sku: row.sku, field: "category", expected: row.category, actual: dbCat });
    }
    const dbBrand = db.brand.translations[0]?.name ?? "";
    if (catalogIdentityKey(dbBrand) !== catalogIdentityKey(row.brand)) {
      mismatches.push({ sku: row.sku, field: "brand", expected: row.brand, actual: dbBrand });
    }
  }

  const categoryTranslations = await prisma.categoryTranslation.findMany({
    where: { locale: "ka" },
    select: { name: true },
  });
  const brandTranslations = await prisma.brandTranslation.findMany({
    where: { locale: "ka" },
    select: { name: true },
  });
  const categoryKeys = new Set(categoryTranslations.map((c) => catalogIdentityKey(c.name)));
  const brandKeys = new Set(brandTranslations.map((b) => catalogIdentityKey(b.name)));

  const expectedCatsToCreate = dryRun.categoriesToCreate ?? [];
  const expectedBrandsToCreate = dryRun.brandsToCreate ?? [];
  const missingExpectedCategories = expectedCatsToCreate.filter(
    (name) => !categoryKeys.has(catalogIdentityKey(name)),
  );
  const missingExpectedBrands = expectedBrandsToCreate.filter(
    (name) => !brandKeys.has(catalogIdentityKey(name)),
  );
  const reusedCategoriesPresent = (dryRun.categoriesToReuse ?? []).filter((name) =>
    categoryKeys.has(catalogIdentityKey(name)),
  );
  const reusedBrandsPresent = (dryRun.brandsToReuse ?? []).filter((name) =>
    brandKeys.has(catalogIdentityKey(name)),
  );

  const withImages = dbProducts.filter((p) => p._count.images > 0);
  const withVariants = dbProducts.filter((p) => p._count.variants > 0);
  const withSpecs = dbProducts.filter((p) => p._count.specifications > 0);
  const withReviews = dbProducts.filter((p) => p._count.reviews > 0 || p.reviewCount > 0);
  const withRelations = dbProducts.filter((p) => p._count.relations > 0);
  const withStock = dbProducts.filter((p) => p.stockQuantity !== 0);
  const withPrevPrice = dbProducts.filter((p) => p.previousPrice != null);
  // Only non-approved-update Excel SKUs must have zero images/specs/etc from this import.
  const createWithImages = dbProducts.filter((p) => p._count.images > 0 && !APPROVED_UPDATE_SKUS.has(p.sku));
  const createWithVariants = dbProducts.filter((p) => p._count.variants > 0 && !APPROVED_UPDATE_SKUS.has(p.sku));
  const createWithSpecs = dbProducts.filter((p) => p._count.specifications > 0 && !APPROVED_UPDATE_SKUS.has(p.sku));
  const createWithReviews = dbProducts.filter(
    (p) => (p._count.reviews > 0 || p.reviewCount > 0) && !APPROVED_UPDATE_SKUS.has(p.sku),
  );
  const createWithRelations = dbProducts.filter((p) => p._count.relations > 0 && !APPROVED_UPDATE_SKUS.has(p.sku));
  const createWithStock = dbProducts.filter((p) => p.stockQuantity !== 0 && !APPROVED_UPDATE_SKUS.has(p.sku));

  const philips = PHILIPS_DUPLICATE_REVIEW.map((sku) => {
    const db = byDbSku.get(sku);
    return {
      sku,
      present: Boolean(db),
      slug: db?.slug ?? null,
      seoTitle: db?.translations[0]?.seoTitle ?? null,
    };
  });

  const elapsedMs = Date.now() - started;
  const expectedProductCount = 513;
  const inventoryBefore = dryRun.inventoryBefore?.products ?? 58;
  const reportedCreated = verifyOnly
    ? afterCount - inventoryBefore
    : createdIds.length;
  const reportedUpdated = verifyOnly ? APPROVED_UPDATE_SKUS.size : updatedIds.length;
  const updatedSkuList = verifyOnly
    ? [...APPROVED_UPDATE_SKUS]
    : toUpdate.map((x) => x.row.sku);

  // Prefer categories/brands created during write; on verify-only use dry-run expected lists that exist.
  if (verifyOnly) {
    createdCategories = expectedCatsToCreate.filter((name) => categoryKeys.has(catalogIdentityKey(name)));
    createdBrands = expectedBrandsToCreate.filter((name) => brandKeys.has(catalogIdentityKey(name)));
  }

  const success =
    failed.length === 0 &&
    afterCount === expectedProductCount &&
    dbProducts.length === 458 &&
    missingInDb.length === 0 &&
    skuDupCheck.length === 0 &&
    slugDupCheck.length === 0 &&
    mismatches.length === 0 &&
    reportedCreated === 455 &&
    reportedUpdated === 3 &&
    missingExpectedCategories.length === 0 &&
    missingExpectedBrands.length === 0 &&
    createWithImages.length === 0 &&
    createWithVariants.length === 0 &&
    createWithSpecs.length === 0 &&
    createWithReviews.length === 0 &&
    createWithRelations.length === 0 &&
    createWithStock.length === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    mode: verifyOnly ? "PRODUCTION_VERIFY_ONLY" : "PRODUCTION_WRITE",
    writesPerformed: verifyOnly ? false : writesPerformed,
    transport: "neon-websocket-prisma",
    production: {
      provider: target.provider,
      sanitizedHost: target.sanitizedHost,
      database: target.database,
      sslmode: target.sslmode,
      confirmedNeon: true,
    },
    inventory: {
      before: verifyOnly ? inventoryBefore : beforeCount,
      after: afterCount,
      expectedAfter: expectedProductCount,
    },
    created: reportedCreated,
    updated: reportedUpdated,
    updatedSkus: updatedSkuList,
    failed: failed.length,
    slugChanges,
    excelSkusRepresented: dbProducts.length,
    missingExcelSkus: missingInDb,
    duplicateSkus: skuDupCheck.map((r) => ({ sku: r.sku, count: Number(r.c) })),
    duplicateSlugs: slugDupCheck.map((r) => ({ slug: r.slug, count: Number(r.c) })),
    mismatches,
    mismatchCount: mismatches.length,
    createdCategories,
    createdBrands,
    categoryPlan: {
      expectedToCreate: expectedCatsToCreate.length,
      missingExpectedCategories,
      reusedPresent: reusedCategoriesPresent,
      totalKaCategories: categoryTranslations.length,
    },
    brandPlan: {
      expectedToCreate: expectedBrandsToCreate.length,
      missingExpectedBrands,
      reusedPresent: reusedBrandsPresent,
      totalKaBrands: brandTranslations.length,
    },
    accidentalData: {
      note: "Pre-existing update SKUs may retain prior images/specs; CREATE SKUs must be zero.",
      allExcelWithImages: withImages.map((p) => p.sku),
      allExcelWithVariants: withVariants.map((p) => p.sku),
      allExcelWithSpecs: withSpecs.map((p) => p.sku),
      allExcelWithReviews: withReviews.map((p) => p.sku),
      allExcelWithRelations: withRelations.map((p) => p.sku),
      allExcelWithStock: withStock.map((p) => p.sku),
      allExcelWithPrevPrice: withPrevPrice.map((p) => p.sku),
      createWithImages: createWithImages.map((p) => p.sku),
      createWithVariants: createWithVariants.map((p) => p.sku),
      createWithSpecs: createWithSpecs.map((p) => p.sku),
      createWithReviews: createWithReviews.map((p) => p.sku),
      createWithRelations: createWithRelations.map((p) => p.sku),
      createWithStock: createWithStock.map((p) => p.sku),
    },
    philipsDuplicateReview: {
      status: "INVENTORY_DUPLICATE_REVIEW",
      skus: philips,
      note: "Both SKUs kept separate; identical SEO metadata accepted",
    },
    elapsedMs,
    failedRows: failed,
    success,
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log(`Products after import: ${afterCount} (expected ${expectedProductCount})`);
  console.log(`Excel SKUs in DB: ${dbProducts.length}/458`);
  console.log(`Created: ${reportedCreated}`);
  console.log(`Updated: ${reportedUpdated} [${updatedSkuList.join(", ")}]`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Duplicate SKUs: ${skuDupCheck.length}`);
  console.log(`Duplicate slugs: ${slugDupCheck.length}`);
  console.log(`Field mismatches: ${mismatches.length}`);
  console.log(`Categories created this run: ${createdCategories.length}`);
  console.log(`Brands created this run: ${createdBrands.length}`);
  console.log(`Missing expected categories: ${missingExpectedCategories.length}`);
  console.log(`Missing expected brands: ${missingExpectedBrands.length}`);
  console.log(
    `CREATE accidental images/variants/specs/reviews/relations/stock: ${createWithImages.length}/${createWithVariants.length}/${createWithSpecs.length}/${createWithReviews.length}/${createWithRelations.length}/${createWithStock.length}`,
  );
  console.log(
    `Pre-existing Excel rows with images/specs (expected update SKUs only): images=${withImages.map((p) => p.sku).join(",") || "(none)"} specs=${withSpecs.map((p) => p.sku).join(",") || "(none)"}`,
  );
  console.log("\n--- Philips ---");
  for (const p of philips) {
    console.log(`  ${p.sku}: present=${p.present} slug=${p.slug}`);
  }
  if (mismatches.length) {
    console.log("\n--- Mismatches (first 30) ---");
    for (const m of mismatches.slice(0, 30)) {
      console.log(`  ${m.sku} ${m.field}: expected="${m.expected}" actual="${m.actual}"`);
    }
  }

  console.log(`\nReport: ${OUT_PATH}`);
  console.log(`Elapsed: ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`\n>>> ${success ? "PRODUCTION IMPORT SUCCEEDED" : "PRODUCTION IMPORT INCOMPLETE / MISMATCH"} <<<\n`);

  await prisma.$disconnect();
  if (!success) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error("Production import failed.");
  console.error(error instanceof Error ? error.message : error);
  try {
    const { prisma } = await import("../src/server/prisma");
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
