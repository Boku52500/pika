/**
 * LOCAL-ONLY import of approved AI SEO manifest into PostgreSQL.
 *
 * - Excel authoritative for SKU/name/brand/category/price
 * - Manifest authoritative for short/full/seo/slug
 * - Creates missing Excel SKUs; updates existing Excel SKUs' AI content fields
 * - Leaves non-Excel catalogue products untouched
 *
 * Usage:
 *   npm run products:import-ai-manifest -- "C:\\path\\products.xlsx"
 */
import fs from "node:fs/promises";
import path from "node:path";

import { loadLocalEnv } from "./loadLocalEnv";

loadLocalEnv();

import type { AiSeoManifest, AiSeoManifestEntry } from "../src/lib/productImport/aiSeoManifest";
import { parseAllExcelProducts, type ExcelProductRow } from "../src/lib/productImport/excelProducts";
import { catalogIdentityKey } from "../src/lib/productImport/slug";
import type { PlannedProduct, RowIssue } from "../src/lib/productImport/types";
import {
  executeProductImport,
  loadPlanImportContext,
  updateExistingProductAiContent,
} from "../src/server/import/productImportDb";
import { searchProducts } from "../src/server/search/search";
import { isManuallyPurchasable } from "../src/server/commerce/variantResolution";
import { prisma } from "../src/server/prisma";
import { parseMoneyInput } from "../src/server/money";

const PHILIPS_DUPLICATE_REVIEW = ["172492", "177053"] as const;
const MANIFEST_PATH = path.join(process.cwd(), "tmp", "product-seo-ai-review.json");

function assertLocalDatabase(): { host: string; database: string; port: string } {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL missing — refusing import");
  const parsed = new URL(url);
  const host = parsed.hostname;
  const port = parsed.port || "5432";
  const database = (parsed.pathname || "/").replace(/^\//, "").split("?")[0] ?? "";
  const isNeon = /neon\.tech|\.neon\./i.test(host);
  const isLocal = ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host);
  if (isNeon || !isLocal) {
    throw new Error(`REFUSING WRITE: database host "${host}" is not local Docker PostgreSQL`);
  }
  return { host, database, port };
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
    console.error('Usage: npm run products:import-ai-manifest -- "C:\\path\\products.xlsx"');
    process.exit(1);
  }

  const dbInfo = assertLocalDatabase();
  console.log("\n=== LOCAL AI Manifest Import — Preflight ===\n");
  console.log(`DATABASE host: ${dbInfo.host}`);
  console.log(`DATABASE port: ${dbInfo.port}`);
  console.log(`DATABASE name: ${dbInfo.database}`);
  console.log("Confirmed: local Docker PostgreSQL (NOT Neon / NOT production)");

  const filePath = path.resolve(fileArg);
  const excelRows = parseAllExcelProducts(filePath);
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as AiSeoManifest;
  if (manifest.entries.length !== 458) {
    throw new Error(`Expected 458 manifest entries, got ${manifest.entries.length}`);
  }
  if (excelRows.length !== 458) {
    throw new Error(`Expected 458 Excel rows, got ${excelRows.length}`);
  }

  const bySku = new Map(manifest.entries.map((e) => [e.sku, e]));
  for (const row of excelRows) {
    if (!bySku.has(row.sku)) throw new Error(`Manifest missing Excel SKU ${row.sku}`);
  }

  const context = await loadPlanImportContext();
  const toCreate: PlannedProduct[] = [];
  const toUpdate: Array<{ row: ExcelProductRow; entry: AiSeoManifestEntry }> = [];
  const missingManifest: string[] = [];

  for (const row of excelRows) {
    const entry = bySku.get(row.sku);
    if (!entry || entry.generationStatus === "failed") {
      missingManifest.push(row.sku);
      continue;
    }
    if (context.existingSkus.has(row.sku)) {
      toUpdate.push({ row, entry });
    } else {
      const categoryExists = context.existingCategories.has(catalogIdentityKey(row.category));
      const brandExists = context.existingBrands.has(catalogIdentityKey(row.brand));
      toCreate.push(toPlanned(row, entry, categoryExists, brandExists));
    }
  }

  const nonExcelCount = await prisma.product.count({
    where: { sku: { notIn: excelRows.map((r) => r.sku) } },
  });

  console.log(`\nExcel products: ${excelRows.length}`);
  console.log(`Manifest entries: ${manifest.entries.length}`);
  console.log(`To CREATE: ${toCreate.length}`);
  console.log(`To UPDATE (existing Excel SKUs): ${toUpdate.length}`);
  console.log(`Non-Excel catalogue products left untouched: ${nonExcelCount}`);
  console.log(`Philips INVENTORY_DUPLICATE_REVIEW: ${PHILIPS_DUPLICATE_REVIEW.join(", ")}`);

  if (missingManifest.length) {
    console.error(`Missing/failed manifest SKUs: ${missingManifest.join(", ")}`);
    process.exit(1);
  }

  const started = Date.now();
  const failed: RowIssue[] = [];
  let createdIds: string[] = [];
  let createdCategories: string[] = [];
  let createdBrands: string[] = [];
  const updatedIds: string[] = [];
  let slugChanges = 0;

  if (toCreate.length) {
    console.log(`\nCreating ${toCreate.length} product(s)...`);
    const result = await executeProductImport(toCreate);
    createdIds = result.createdProductIds;
    createdCategories = result.createdCategories;
    createdBrands = result.createdBrands;
    failed.push(...result.failed);
    console.log(`Created: ${createdIds.length}; failed creates: ${result.failed.length}`);
  }

  console.log(`\nUpdating AI content for ${toUpdate.length} existing Excel SKU(s)...`);
  let updateDone = 0;
  for (const { row, entry } of toUpdate) {
    updateDone += 1;
    if (updateDone % 50 === 0 || updateDone === toUpdate.length) {
      process.stdout.write(`  update progress ${updateDone}/${toUpdate.length}\n`);
    }
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

  // -------------------------------------------------------------------------
  // Post-import DB audit
  // -------------------------------------------------------------------------
  console.log("\n=== Post-import database audit ===\n");
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
          installmentTerms: true,
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
  const nameMismatches: string[] = [];
  const priceMismatches: string[] = [];
  const categoryMismatches: string[] = [];
  const brandMismatches: string[] = [];

  for (const row of excelRows) {
    const entry = bySku.get(row.sku)!;
    const db = byDbSku.get(row.sku);
    if (!db) continue;
    const t = db.translations[0];
    const checks: Array<[string, string, string | null | undefined]> = [
      ["shortDescription", entry.aiShortDescription, t?.shortDescription],
      ["fullDescription", entry.aiFullDescription, t?.description],
      ["seoTitle", entry.aiSeoTitle, t?.seoTitle],
      ["seoDescription", entry.aiSeoDescription, t?.seoDescription],
      ["slug", entry.finalValidatedSlug, db.slug],
    ];
    for (const [field, expected, actual] of checks) {
      if ((actual ?? "") !== expected) {
        // Allow slug SKU-suffix collision resolution
        if (field === "slug" && (actual ?? "").startsWith(expected) && (actual ?? "").endsWith(row.sku)) {
          continue;
        }
        mismatches.push({ sku: row.sku, field, expected: expected.slice(0, 80), actual: (actual ?? "").slice(0, 80) });
      }
    }
    if ((t?.name ?? "") !== row.name) nameMismatches.push(row.sku);
    if (parseMoneyInput(row.price).toString() !== db.price.toString()) priceMismatches.push(row.sku);
    const dbCat = db.category.translations[0]?.name ?? "";
    if (catalogIdentityKey(dbCat) !== catalogIdentityKey(row.category)) categoryMismatches.push(row.sku);
    const dbBrand = db.brand.translations[0]?.name ?? "";
    if (catalogIdentityKey(dbBrand) !== catalogIdentityKey(row.brand)) brandMismatches.push(row.sku);
  }

  const withImages = dbProducts.filter((p) => p._count.images > 0).length;
  const withVariants = dbProducts.filter((p) => p._count.variants > 0).length;
  const withSpecs = dbProducts.filter((p) => p._count.specifications > 0).length;
  const withReviews = dbProducts.filter((p) => p._count.reviews > 0 || p.reviewCount > 0).length;
  const withRelations = dbProducts.filter((p) => p._count.relations > 0).length;
  const withPrevPrice = dbProducts.filter((p) => p.previousPrice != null).length;
  const withStock = dbProducts.filter((p) => p.stockQuantity !== 0).length;
  const inactive = dbProducts.filter((p) => !p.isActive || p.deletedAt).length;

  console.log(`Excel SKUs in DB: ${dbProducts.length}/458`);
  console.log(`Missing Excel SKUs: ${missingInDb.length}`);
  console.log(`Duplicate SKUs: ${skuDupCheck.length}`);
  console.log(`Duplicate slugs: ${slugDupCheck.length}`);
  console.log(`Manifest content mismatches: ${mismatches.length}`);
  console.log(`Name mismatches vs Excel: ${nameMismatches.length}`);
  console.log(`Price mismatches vs Excel: ${priceMismatches.length}`);
  console.log(`Category mismatches: ${categoryMismatches.length}`);
  console.log(`Brand mismatches: ${brandMismatches.length}`);
  console.log(`Products with images: ${withImages}`);
  console.log(`Products with variants: ${withVariants}`);
  console.log(`Products with specs: ${withSpecs}`);
  console.log(`Products with reviews: ${withReviews}`);
  console.log(`Products with relations: ${withRelations}`);
  console.log(`Products with previousPrice: ${withPrevPrice}`);
  console.log(`Products with non-zero stockQuantity: ${withStock}`);
  console.log(`Inactive/archived Excel products: ${inactive}`);
  console.log(`Created categories this run: ${createdCategories.join(", ") || "(none)"}`);
  console.log(`Created brands this run: ${createdBrands.join(", ") || "(none)"}`);
  console.log(`Slug changes on update: ${slugChanges}`);
  console.log(`Failed rows: ${failed.length}`);

  if (mismatches.length) {
    console.log("\n--- Content mismatches (first 20) ---");
    for (const m of mismatches.slice(0, 20)) {
      console.log(`  ${m.sku} ${m.field}: expected="${m.expected}" actual="${m.actual}"`);
    }
  }

  // Philips pair
  console.log("\n--- Philips INVENTORY_DUPLICATE_REVIEW ---");
  for (const sku of PHILIPS_DUPLICATE_REVIEW) {
    const db = byDbSku.get(sku);
    console.log(
      `  ${sku}: name=${db?.translations[0]?.name} slug=${db?.slug} seoTitle=${db?.translations[0]?.seoTitle}`,
    );
  }

  // -------------------------------------------------------------------------
  // Storefront / search QA sample
  // -------------------------------------------------------------------------
  console.log("\n=== Storefront / search QA ===\n");
  const sampleSkus = [
    "152597",
    "173643",
    "173400",
    "161581",
    "176309",
    "157970",
    "172680",
    "174216",
    "139804",
    "174714",
    "169531",
    "165420",
    "165419",
    "172492",
    "177053",
    "154370",
    "173175",
    "150990",
    "163849",
    "169404",
    "174249",
    "176028",
    "175762",
    "167185",
    "172046",
    "160903",
    "175337",
    "176839",
    "175961",
    "174588",
  ];

  const qaRows = await prisma.product.findMany({
    where: { sku: { in: sampleSkus } },
    select: {
      sku: true,
      slug: true,
      price: true,
      isActive: true,
      deletedAt: true,
      stockQuantity: true,
      translations: {
        where: { locale: "ka" },
        select: { name: true, shortDescription: true, description: true, seoTitle: true, seoDescription: true },
      },
      variants: { select: { isActive: true } },
      _count: { select: { images: true } },
      category: { select: { slug: true, translations: { where: { locale: "ka" }, select: { name: true } } } },
      brand: { select: { slug: true, translations: { where: { locale: "ka" }, select: { name: true } } } },
    },
  });

  let qaOk = 0;
  const qaIssues: string[] = [];
  for (const p of qaRows) {
    const t = p.translations[0];
    const purchasable = isManuallyPurchasable({
      productActive: p.isActive,
      productDeleted: Boolean(p.deletedAt),
      variantActive: p.variants.length === 0 ? true : p.variants.some((v) => v.isActive),
    });
    const georgianOk = /[\u10A0-\u10FF]/.test(`${t?.shortDescription ?? ""}${t?.description ?? ""}`);
    const hasSeo = Boolean(t?.seoTitle && t?.seoDescription);
    const hasCopy = Boolean(t?.shortDescription && t?.description);
    const ok = Boolean(t?.name) && hasCopy && hasSeo && Boolean(p.slug) && purchasable && georgianOk;
    if (ok) qaOk += 1;
    else {
      qaIssues.push(
        `${p.sku}: name=${Boolean(t?.name)} copy=${hasCopy} seo=${hasSeo} slug=${p.slug} purchasable=${purchasable} ka=${georgianOk} stock=${p.stockQuantity} images=${p._count.images}`,
      );
    }
  }
  console.log(`QA sample products checked: ${qaRows.length}`);
  console.log(`QA sample OK: ${qaOk}`);
  if (qaIssues.length) {
    console.log("QA issues:");
    for (const issue of qaIssues) console.log(`  ${issue}`);
  }

  const searchTerms = ["asus", "intel", "ssd", "lenovo", "samsung", "iphone", "monitor", "router"];
  const searchTimings: Array<{ term: string; ms: number; hits: number }> = [];
  for (const term of searchTerms) {
    const t0 = Date.now();
    const hits = await searchProducts(term, { take: 24 });
    searchTimings.push({ term, ms: Date.now() - t0, hits: hits.length });
  }
  console.log("\nSearch timings (application-level):");
  for (const row of searchTimings) {
    console.log(`  ${row.term}: ${row.ms}ms (${row.hits} hits)`);
  }

  const totalLocal = await prisma.product.count();
  const elapsedMs = Date.now() - started;

  const report = {
    generatedAt: new Date().toISOString(),
    database: { host: dbInfo.host, port: dbInfo.port, database: dbInfo.database, localOnly: true },
    created: createdIds.length,
    updated: updatedIds.length,
    failed: failed.length,
    skippedNonExcel: nonExcelCount,
    finalLocalProductCount: totalLocal,
    excelSkusRepresented: dbProducts.length,
    duplicateSkus: skuDupCheck,
    duplicateSlugs: slugDupCheck,
    manifestMismatches: mismatches.length,
    mismatchSamples: mismatches.slice(0, 30),
    nameMismatches: nameMismatches.length,
    priceMismatches: priceMismatches.length,
    categoryMismatches: categoryMismatches.length,
    brandMismatches: brandMismatches.length,
    createdCategories,
    createdBrands,
    productsWithoutImages: dbProducts.length - withImages,
    productsWithoutVariants: dbProducts.length - withVariants,
    withSpecs,
    withReviews,
    withRelations,
    withPrevPrice,
    withStock,
    philipsDuplicateReview: {
      status: "INVENTORY_DUPLICATE_REVIEW",
      skus: [...PHILIPS_DUPLICATE_REVIEW],
      note: "Imported both; identical SEO metadata acceptable until inventory source review",
    },
    storefrontQa: { checked: qaRows.length, ok: qaOk, issues: qaIssues },
    searchTimings,
    elapsedMs,
    failedRows: failed,
  };

  const outPath = path.join(process.cwd(), "tmp", "product-ai-manifest-import-report.json");
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport written: ${outPath}`);
  console.log(`Elapsed: ${(elapsedMs / 1000).toFixed(1)}s`);

  const ready =
    missingInDb.length === 0 &&
    dbProducts.length === 458 &&
    skuDupCheck.length === 0 &&
    slugDupCheck.length === 0 &&
    mismatches.length === 0 &&
    nameMismatches.length === 0 &&
    priceMismatches.length === 0 &&
    failed.length === 0 &&
    withReviews === 0 &&
    withRelations === 0 &&
    withSpecs === 0 &&
    withStock === 0 &&
    qaOk === qaRows.length;

  console.log(`\n>>> ${ready ? "READY FOR PRODUCTION IMPORT" : "NOT READY FOR PRODUCTION IMPORT"} <<<\n`);
  console.log("No production/Neon/commit/push/deploy performed.");

  if (!ready) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("AI manifest import failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
