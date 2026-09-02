/**
 * READ-ONLY production (Neon) dry-run for the approved 458-product AI catalogue import.
 *
 * Guarantees:
 * - Loads production env from `.env.production.local` only (Vercel production pull)
 * - Connects to Neon over HTTPS SQL (port 443) — no TCP 5432 writes path
 * - Issues SELECT / information_schema queries only
 * - Never migrate / seed / insert / update / delete
 *
 * Usage:
 *   npx vercel env pull .env.production.local --environment=production --yes
 *   npm run products:production-dry-run -- "C:\\path\\products.xlsx"
 *   # then delete .env.production.local
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";

import type { AiSeoManifest } from "../src/lib/productImport/aiSeoManifest";
import { parseAllExcelProducts } from "../src/lib/productImport/excelProducts";
import { catalogIdentityKey } from "../src/lib/productImport/slug";
import {
  containsForbiddenGeorgia,
  containsMixedScriptGeorgian,
} from "../src/lib/productImport/validateAiClaims";
import { parseMoneyInput } from "../src/server/money";

const PHILIPS_DUPLICATE_REVIEW = ["172492", "177053"] as const;
const MANIFEST_PATH = path.join(process.cwd(), "tmp", "product-seo-ai-review.json");
const LOCAL_IMPORT_REPORT_PATH = path.join(process.cwd(), "tmp", "product-ai-manifest-import-report.json");
const OUT_PATH = path.join(process.cwd(), "tmp", "product-production-import-dry-run.json");
const PROD_ENV_PATH = path.join(process.cwd(), ".env.production.local");

const REQUIRED_PRODUCT_COLUMNS = [
  "id",
  "sku",
  "slug",
  "brandId",
  "categoryId",
  "price",
  "previousPrice",
  "stockQuantity",
  "isActive",
  "deletedAt",
  "indexable",
];
const REQUIRED_TRANSLATION_COLUMNS = [
  "id",
  "productId",
  "locale",
  "name",
  "shortDescription",
  "description",
  "seoTitle",
  "seoDescription",
];

const WRITE_SQL =
  /\b(INSERT|UPDATE|DELETE|UPSERT|MERGE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|COPY|CALL|DO)\b/i;

type SkuAction =
  | "CREATE"
  | "ALREADY_EXISTS_IDENTICAL"
  | "ALREADY_EXISTS_DIFFERENT"
  | "CONFLICT"
  | "INVALID";

type PlannedSku = {
  sku: string;
  action: SkuAction;
  excelName: string;
  excelBrand: string;
  excelCategory: string;
  excelPrice: string;
  proposedSlug: string;
  proposedSeoTitle: string;
  proposedSeoDescription: string;
  differences?: string[];
  conflicts?: string[];
  notes?: string[];
};

type ProdProduct = {
  id: string;
  sku: string;
  slug: string;
  price: string;
  previousPrice: string | null;
  stockQuantity: number;
  isActive: boolean;
  deletedAt: string | null;
  name: string | null;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  brandName: string | null;
  categoryName: string | null;
};

function loadProductionEnvFile(): Record<string, string> {
  if (!fs.existsSync(PROD_ENV_PATH)) {
    throw new Error(
      "Missing .env.production.local. Pull production env first:\n" +
        "  npx vercel env pull .env.production.local --environment=production --yes",
    );
  }
  const parsed = dotenv.parse(fs.readFileSync(PROD_ENV_PATH));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v && v !== "[SENSITIVE]") out[k] = v;
  }
  return out;
}

function sanitizeHost(hostname: string): string {
  if (/neon\.tech$/i.test(hostname)) {
    const parts = hostname.split(".");
    if (parts.length >= 4) return `*.${parts.slice(-4).join(".")}`;
    return `*.neon.tech`;
  }
  return hostname.replace(/^[^.]+\./, "*.");
}

function assertNeonProductionUrl(databaseUrl: string): {
  host: string;
  sanitizedHost: string;
  database: string;
  port: string;
  sslmode: string | null;
  provider: "Neon";
} {
  if (!databaseUrl || databaseUrl === "[SENSITIVE]") {
    throw new Error(
      "Production DATABASE_URL missing or redacted ([SENSITIVE]). Re-pull with a full Neon connection string.",
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Production DATABASE_URL is not a valid URL");
  }
  const host = parsed.hostname;
  const database = (parsed.pathname || "/").replace(/^\//, "").split("?")[0] ?? "";
  const port = parsed.port || "5432";
  const sslmode = parsed.searchParams.get("sslmode");
  const isNeon = /neon\.tech$/i.test(host);
  const isLocal = ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host);
  if (!isNeon) {
    throw new Error(`Refusing dry-run: host "${sanitizeHost(host)}" is not Neon production`);
  }
  if (isLocal) {
    throw new Error("Refusing dry-run: DATABASE_URL points at local PostgreSQL");
  }
  return {
    host,
    sanitizedHost: sanitizeHost(host),
    database,
    port,
    sslmode,
    provider: "Neon",
  };
}

/** Neon HTTPS SQL client — SELECT-only guard. */
function createNeonHttpSql(databaseUrl: string) {
  const host = new URL(databaseUrl).hostname;
  const endpoint = `https://${host}/sql`;

  async function sql<T extends Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
    if (WRITE_SQL.test(query)) {
      throw new Error(`Refusing non-SELECT SQL in production dry-run: ${query.slice(0, 80)}`);
    }
    const trimmed = query.trim().replace(/;+\s*$/, "");
    if (!/^(SELECT|WITH|SHOW)\b/i.test(trimmed)) {
      throw new Error(`Refusing non-read SQL in production dry-run: ${query.slice(0, 80)}`);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Neon-Connection-String": databaseUrl,
      },
      body: JSON.stringify({ query: trimmed, params }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Neon HTTPS SQL failed (${response.status}): ${text.slice(0, 300)}`);
    }
    const body = JSON.parse(text) as { rows?: T[]; message?: string };
    return body.rows ?? [];
  }

  return { sql };
}

function normText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function moneyEqual(a: string, b: unknown): boolean {
  try {
    return parseMoneyInput(a).toString() === String(b);
  } catch {
    return false;
  }
}

function verifyManifestIntegrity(manifest: AiSeoManifest): {
  ok: boolean;
  issues: string[];
  georgia: number;
  mixedScript: number;
  missingContent: number;
  duplicateSkus: string[];
  duplicateSlugs: string[];
  blockingFlags: number;
} {
  const issues: string[] = [];
  if (manifest.entries.length !== 458) issues.push(`entryCount=${manifest.entries.length} expected 458`);

  const skuCounts = new Map<string, number>();
  const slugCounts = new Map<string, number>();
  let missingContent = 0;
  let georgia = 0;
  let mixedScript = 0;
  let blockingFlags = 0;

  for (const e of manifest.entries) {
    skuCounts.set(e.sku, (skuCounts.get(e.sku) ?? 0) + 1);
    slugCounts.set(e.finalValidatedSlug, (slugCounts.get(e.finalValidatedSlug) ?? 0) + 1);
    if (
      !e.aiShortDescription ||
      !e.aiFullDescription ||
      !e.aiSeoTitle ||
      !e.aiSeoDescription ||
      !e.finalValidatedSlug
    ) {
      missingContent += 1;
    }
    const combined = [e.aiShortDescription, e.aiFullDescription, e.aiSeoTitle, e.aiSeoDescription].join("\n");
    if (containsForbiddenGeorgia(combined)) georgia += 1;
    if (containsMixedScriptGeorgian(combined)) mixedScript += 1;
    for (const f of e.qualityFlags) {
      if (
        [
          "FORBIDDEN_CLAIM",
          "FORBIDDEN_GEORGIA_IN",
          "WEAK_SEO_META",
          "INVENTED_SPEC",
          "MIXED_SCRIPT_GEORGIAN",
          "GENERATION_FAILED",
        ].includes(f.code)
      ) {
        blockingFlags += 1;
      }
    }
    if (e.generationStatus === "failed") missingContent += 1;
  }

  const duplicateSkus = [...skuCounts.entries()].filter(([, c]) => c > 1).map(([s]) => s);
  const duplicateSlugs = [...slugCounts.entries()].filter(([, c]) => c > 1).map(([s]) => s);

  if (missingContent) issues.push(`missingContent=${missingContent}`);
  if (georgia) issues.push(`საქართველოში products=${georgia}`);
  if (mixedScript) issues.push(`mixedScript products=${mixedScript}`);
  if (duplicateSkus.length) issues.push(`duplicateSkus=${duplicateSkus.join(",")}`);
  if (duplicateSlugs.length) issues.push(`duplicateSlugs=${duplicateSlugs.slice(0, 10).join(",")}`);
  if (blockingFlags) issues.push(`blockingFlags=${blockingFlags}`);

  return {
    ok: issues.length === 0,
    issues,
    georgia,
    mixedScript,
    missingContent,
    duplicateSkus,
    duplicateSlugs,
    blockingFlags,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv.find((a) => a && !a.startsWith("--"));
  if (!fileArg) {
    console.error('Usage: npm run products:production-dry-run -- "C:\\path\\products.xlsx"');
    process.exit(1);
  }

  console.log("\n=== PRODUCTION DRY-RUN (READ-ONLY) ===\n");
  console.log("NO INSERT / UPDATE / DELETE / MIGRATE / SEED will be performed.");
  console.log("Transport: Neon HTTPS SQL (SELECT-only guard).\n");

  const prodEnv = loadProductionEnvFile();
  const databaseUrl = prodEnv.DATABASE_URL ?? "";
  const target = assertNeonProductionUrl(databaseUrl);

  console.log("Production connection (sanitized):");
  console.log(`  provider: ${target.provider}`);
  console.log(`  host: ${target.sanitizedHost}`);
  console.log(`  database: ${target.database}`);
  console.log(`  port: ${target.port}`);
  console.log(`  sslmode: ${target.sslmode ?? "(not in URL params)"}`);
  console.log("  confirmed: production Neon\n");

  const excelRows = parseAllExcelProducts(path.resolve(fileArg));
  const manifest = JSON.parse(await fsp.readFile(MANIFEST_PATH, "utf8")) as AiSeoManifest;
  const localReport = JSON.parse(await fsp.readFile(LOCAL_IMPORT_REPORT_PATH, "utf8")) as {
    excelSkusRepresented?: number;
    manifestMismatches?: number;
    failed?: number;
  };

  const integrity = verifyManifestIntegrity(manifest);
  console.log("--- Manifest integrity ---");
  console.log(`  entries: ${manifest.entries.length}`);
  console.log(`  georgia: ${integrity.georgia}`);
  console.log(`  mixed-script: ${integrity.mixedScript}`);
  console.log(`  missing content: ${integrity.missingContent}`);
  console.log(`  duplicate SKUs: ${integrity.duplicateSkus.length}`);
  console.log(`  duplicate slugs: ${integrity.duplicateSlugs.length}`);
  console.log(`  blocking flags: ${integrity.blockingFlags}`);
  console.log(
    `  local import report: excel=${localReport.excelSkusRepresented} mismatches=${localReport.manifestMismatches} failed=${localReport.failed}`,
  );
  if (!integrity.ok) {
    console.error("\nManifest integrity FAILED:");
    for (const issue of integrity.issues) console.error(`  - ${issue}`);
  }

  const byManifest = new Map(manifest.entries.map((e) => [e.sku, e]));
  if (excelRows.length !== 458) throw new Error(`Expected 458 Excel rows, got ${excelRows.length}`);

  const { sql } = createNeonHttpSql(databaseUrl);
  await sql<{ ok: number }>("SELECT 1 AS ok");

  // Schema check
  const productCols = await sql<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Product'`,
  );
  const translationCols = await sql<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'ProductTranslation'`,
  );
  const productColSet = new Set(productCols.map((c) => c.column_name));
  const translationColSet = new Set(translationCols.map((c) => c.column_name));
  const missingProductCols = REQUIRED_PRODUCT_COLUMNS.filter((c) => !productColSet.has(c));
  const missingTranslationCols = REQUIRED_TRANSLATION_COLUMNS.filter((c) => !translationColSet.has(c));

  const brandTable = await sql<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'Brand'
     ) AS exists`,
  );
  const categoryTable = await sql<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'Category'
     ) AS exists`,
  );

  const schemaOk =
    missingProductCols.length === 0 &&
    missingTranslationCols.length === 0 &&
    brandTable[0]?.exists === true &&
    categoryTable[0]?.exists === true;

  console.log("\n--- Schema check ---");
  console.log(`  Product columns missing: ${missingProductCols.join(", ") || "(none)"}`);
  console.log(`  ProductTranslation columns missing: ${missingTranslationCols.join(", ") || "(none)"}`);
  console.log(`  Brand table: ${brandTable[0]?.exists ? "yes" : "NO"}`);
  console.log(`  Category table: ${categoryTable[0]?.exists ? "yes" : "NO"}`);

  if (!schemaOk) {
    console.error("\nSTOP: required production schema is missing. Do not import.");
    await fsp.writeFile(
      OUT_PATH,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode: "READ_ONLY_DRY_RUN",
          writesPerformed: false,
          readiness: "NOT READY FOR PRODUCTION WRITE",
          reason: "Missing required schema columns/tables",
          missingProductCols,
          missingTranslationCols,
        },
        null,
        2,
      ),
      "utf8",
    );
    process.exitCode = 1;
    return;
  }

  const countsRows = await sql<{ products: number; categories: number; brands: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM "Product") AS products,
       (SELECT COUNT(*)::int FROM "Category") AS categories,
       (SELECT COUNT(*)::int FROM "Brand") AS brands`,
  );
  const productCount = Number(countsRows[0]?.products ?? 0);
  const categoryCount = Number(countsRows[0]?.categories ?? 0);
  const brandCount = Number(countsRows[0]?.brands ?? 0);

  const existingProducts = await sql<ProdProduct>(
    `SELECT
       p.id,
       p.sku,
       p.slug,
       p.price::text AS price,
       p."previousPrice"::text AS "previousPrice",
       p."stockQuantity" AS "stockQuantity",
       p."isActive" AS "isActive",
       p."deletedAt"::text AS "deletedAt",
       pt.name,
       pt."shortDescription" AS "shortDescription",
       pt.description,
       pt."seoTitle" AS "seoTitle",
       pt."seoDescription" AS "seoDescription",
       bt.name AS "brandName",
       ct.name AS "categoryName"
     FROM "Product" p
     LEFT JOIN "ProductTranslation" pt ON pt."productId" = p.id AND pt.locale = 'ka'
     LEFT JOIN "Brand" b ON b.id = p."brandId"
     LEFT JOIN "BrandTranslation" bt ON bt."brandId" = b.id AND bt.locale = 'ka'
     LEFT JOIN "Category" c ON c.id = p."categoryId"
     LEFT JOIN "CategoryTranslation" ct ON ct."categoryId" = c.id AND ct.locale = 'ka'`,
  );

  const existingCategories = await sql<{ name: string; categoryId: string }>(
    `SELECT name, "categoryId" FROM "CategoryTranslation" WHERE locale = 'ka'`,
  );
  const existingBrands = await sql<{ name: string; brandId: string }>(
    `SELECT name, "brandId" FROM "BrandTranslation" WHERE locale = 'ka'`,
  );

  const bySku = new Map(existingProducts.map((p) => [p.sku, p]));
  const bySlug = new Map(existingProducts.map((p) => [p.slug, p]));
  const categoryByKey = new Map<string, { name: string; categoryId: string }>();
  for (const c of existingCategories) {
    const key = catalogIdentityKey(c.name);
    if (!categoryByKey.has(key)) categoryByKey.set(key, { name: c.name, categoryId: c.categoryId });
  }
  const brandByKey = new Map<string, { name: string; brandId: string }>();
  for (const b of existingBrands) {
    const key = catalogIdentityKey(b.name);
    if (!brandByKey.has(key)) brandByKey.set(key, { name: b.name, brandId: b.brandId });
  }

  const brandDisplayByKey = new Map<string, Set<string>>();
  for (const b of existingBrands) {
    const key = catalogIdentityKey(b.name);
    const set = brandDisplayByKey.get(key) ?? new Set();
    set.add(b.name);
    brandDisplayByKey.set(key, set);
  }
  const categoryDisplayByKey = new Map<string, Set<string>>();
  for (const c of existingCategories) {
    const key = catalogIdentityKey(c.name);
    const set = categoryDisplayByKey.get(key) ?? new Set();
    set.add(c.name);
    categoryDisplayByKey.set(key, set);
  }
  const brandCaseDupes = [...brandDisplayByKey.entries()]
    .filter(([, names]) => names.size > 1)
    .map(([key, names]) => ({ key, names: [...names] }));
  const categoryCaseDupes = [...categoryDisplayByKey.entries()]
    .filter(([, names]) => names.size > 1)
    .map(([key, names]) => ({ key, names: [...names] }));

  const planned: PlannedSku[] = [];
  const categoriesToCreate = new Set<string>();
  const categoriesToReuse = new Set<string>();
  const brandsToCreate = new Set<string>();
  const brandsToReuse = new Set<string>();
  const slugCollisions: Array<{ sku: string; proposedSlug: string; existingSku: string }> = [];
  const skuCollisionsInFile: string[] = [];
  const invalidRows: string[] = [];
  const proposedSlugOwners = new Map<string, string>();

  for (const row of excelRows) {
    const entry = byManifest.get(row.sku);
    const notes: string[] = [];
    const conflicts: string[] = [];
    const differences: string[] = [];

    if (!entry || entry.generationStatus === "failed") {
      invalidRows.push(row.sku);
      planned.push({
        sku: row.sku,
        action: "INVALID",
        excelName: row.name,
        excelBrand: row.brand,
        excelCategory: row.category,
        excelPrice: row.price,
        proposedSlug: entry?.finalValidatedSlug ?? "",
        proposedSeoTitle: entry?.aiSeoTitle ?? "",
        proposedSeoDescription: entry?.aiSeoDescription ?? "",
        conflicts: ["Missing or failed AI manifest entry"],
      });
      continue;
    }

    if (PHILIPS_DUPLICATE_REVIEW.includes(row.sku as (typeof PHILIPS_DUPLICATE_REVIEW)[number])) {
      notes.push("INVENTORY_DUPLICATE_REVIEW");
    }

    const catKey = catalogIdentityKey(row.category);
    const brandKey = catalogIdentityKey(row.brand);
    if (categoryByKey.has(catKey)) categoriesToReuse.add(categoryByKey.get(catKey)!.name);
    else categoriesToCreate.add(row.category);
    if (brandByKey.has(brandKey)) brandsToReuse.add(brandByKey.get(brandKey)!.name);
    else brandsToCreate.add(row.brand);

    const slugOwner = proposedSlugOwners.get(entry.finalValidatedSlug);
    if (slugOwner && slugOwner !== row.sku) {
      conflicts.push(`Proposed slug also used by Excel SKU ${slugOwner}`);
      slugCollisions.push({
        sku: row.sku,
        proposedSlug: entry.finalValidatedSlug,
        existingSku: slugOwner,
      });
    } else {
      proposedSlugOwners.set(entry.finalValidatedSlug, row.sku);
    }

    const existingBySlug = bySlug.get(entry.finalValidatedSlug);
    if (existingBySlug && existingBySlug.sku !== row.sku) {
      conflicts.push(`Proposed slug collides with production SKU ${existingBySlug.sku}`);
      slugCollisions.push({
        sku: row.sku,
        proposedSlug: entry.finalValidatedSlug,
        existingSku: existingBySlug.sku,
      });
    }

    const existing = bySku.get(row.sku);
    if (!existing) {
      planned.push({
        sku: row.sku,
        action: conflicts.length ? "CONFLICT" : "CREATE",
        excelName: row.name,
        excelBrand: row.brand,
        excelCategory: row.category,
        excelPrice: row.price,
        proposedSlug: entry.finalValidatedSlug,
        proposedSeoTitle: entry.aiSeoTitle,
        proposedSeoDescription: entry.aiSeoDescription,
        conflicts: conflicts.length ? conflicts : undefined,
        notes: notes.length ? notes : undefined,
      });
      continue;
    }

    const checks: Array<[string, boolean]> = [
      ["name", normText(existing.name) === normText(row.name)],
      ["price", moneyEqual(row.price, existing.price)],
      ["brand", catalogIdentityKey(existing.brandName ?? "") === brandKey],
      ["category", catalogIdentityKey(existing.categoryName ?? "") === catKey],
      ["shortDescription", normText(existing.shortDescription) === normText(entry.aiShortDescription)],
      ["fullDescription", normText(existing.description) === normText(entry.aiFullDescription)],
      ["seoTitle", normText(existing.seoTitle) === normText(entry.aiSeoTitle)],
      ["seoDescription", normText(existing.seoDescription) === normText(entry.aiSeoDescription)],
      ["slug", existing.slug === entry.finalValidatedSlug],
    ];
    for (const [field, ok] of checks) {
      if (!ok) differences.push(field);
    }

    let action: SkuAction = differences.length === 0 ? "ALREADY_EXISTS_IDENTICAL" : "ALREADY_EXISTS_DIFFERENT";
    if (conflicts.length) action = "CONFLICT";

    planned.push({
      sku: row.sku,
      action,
      excelName: row.name,
      excelBrand: row.brand,
      excelCategory: row.category,
      excelPrice: row.price,
      proposedSlug: entry.finalValidatedSlug,
      proposedSeoTitle: entry.aiSeoTitle,
      proposedSeoDescription: entry.aiSeoDescription,
      differences: differences.length ? differences : undefined,
      conflicts: conflicts.length ? conflicts : undefined,
      notes: notes.length ? notes : undefined,
    });
  }

  if (new Set(excelRows.map((r) => r.sku)).size !== excelRows.length) {
    skuCollisionsInFile.push("Excel parser returned fewer unique SKUs than rows");
  }

  const actionCounts = {
    CREATE: planned.filter((p) => p.action === "CREATE").length,
    ALREADY_EXISTS_IDENTICAL: planned.filter((p) => p.action === "ALREADY_EXISTS_IDENTICAL").length,
    ALREADY_EXISTS_DIFFERENT: planned.filter((p) => p.action === "ALREADY_EXISTS_DIFFERENT").length,
    CONFLICT: planned.filter((p) => p.action === "CONFLICT").length,
    INVALID: planned.filter((p) => p.action === "INVALID").length,
  };

  const createSlugCollisions = slugCollisions.filter((c) =>
    planned.some((p) => p.sku === c.sku && (p.action === "CREATE" || p.action === "CONFLICT")),
  );

  const finalReadiness =
    integrity.ok &&
    schemaOk &&
    actionCounts.CONFLICT === 0 &&
    actionCounts.INVALID === 0 &&
    createSlugCollisions.length === 0
      ? "READY FOR PRODUCTION WRITE"
      : "NOT READY FOR PRODUCTION WRITE";

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "READ_ONLY_DRY_RUN",
    writesPerformed: false,
    transport: "neon-https-sql",
    production: {
      provider: target.provider,
      sanitizedHost: target.sanitizedHost,
      database: target.database,
      port: target.port,
      sslmode: target.sslmode,
      confirmedNeon: true,
    },
    schema: {
      ok: schemaOk,
      missingProductCols,
      missingTranslationCols,
    },
    inventoryBefore: {
      products: productCount,
      categories: categoryCount,
      brands: brandCount,
    },
    manifestIntegrity: integrity,
    localImportReportSummary: {
      excelSkusRepresented: localReport.excelSkusRepresented ?? null,
      manifestMismatches: localReport.manifestMismatches ?? null,
      failed: localReport.failed ?? null,
    },
    actionCounts,
    categoriesToCreate: [...categoriesToCreate].sort((a, b) => a.localeCompare(b, "ka")),
    categoriesToReuse: [...categoriesToReuse].sort((a, b) => a.localeCompare(b, "ka")),
    brandsToCreate: [...brandsToCreate].sort((a, b) => a.localeCompare(b, "ka")),
    brandsToReuse: [...brandsToReuse].sort((a, b) => a.localeCompare(b, "ka")),
    brandCaseDuplicatesInProduction: brandCaseDupes,
    categoryCaseDuplicatesInProduction: categoryCaseDupes,
    skuCollisionsInFile,
    slugCollisions,
    createSlugCollisions,
    invalidRows,
    philipsDuplicateReview: {
      status: "INVENTORY_DUPLICATE_REVIEW",
      skus: [...PHILIPS_DUPLICATE_REVIEW],
      note: "Both SKUs planned as separate records; identical SEO metadata accepted",
    },
    stockPolicy: {
      stockQuantityControlsPurchasability: false,
      importStockFromExcel: false,
      inventVariantsSpecsImagesReviews: false,
    },
    plannedSkus: planned,
    readiness: finalReadiness,
    warnings: [
      actionCounts.ALREADY_EXISTS_DIFFERENT > 0
        ? `${actionCounts.ALREADY_EXISTS_DIFFERENT} production SKUs already exist with different field values — write step must use explicit update/skip policy (no blind create).`
        : null,
      brandCaseDupes.length > 0
        ? `Production has ${brandCaseDupes.length} brand identity key(s) with multiple display spellings.`
        : null,
    ].filter(Boolean),
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("\n--- Production inventory ---");
  console.log(`  products: ${productCount}`);
  console.log(`  categories: ${categoryCount}`);
  console.log(`  brands: ${brandCount}`);

  console.log("\n--- Action counts ---");
  console.log(`  CREATE: ${actionCounts.CREATE}`);
  console.log(`  ALREADY_EXISTS_IDENTICAL: ${actionCounts.ALREADY_EXISTS_IDENTICAL}`);
  console.log(`  ALREADY_EXISTS_DIFFERENT: ${actionCounts.ALREADY_EXISTS_DIFFERENT}`);
  console.log(`  CONFLICT: ${actionCounts.CONFLICT}`);
  console.log(`  INVALID: ${actionCounts.INVALID}`);

  console.log("\n--- Category / brand plan ---");
  console.log(`  categories to create: ${categoriesToCreate.size}`);
  console.log(`  categories to reuse: ${categoriesToReuse.size}`);
  console.log(`  brands to create: ${brandsToCreate.size}`);
  console.log(`  brands to reuse: ${brandsToReuse.size}`);
  if (categoriesToCreate.size && categoriesToCreate.size <= 40) {
    console.log(`  create categories: ${[...categoriesToCreate].join(", ")}`);
  }
  if (brandsToCreate.size && brandsToCreate.size <= 50) {
    console.log(`  create brands: ${[...brandsToCreate].join(", ")}`);
  }

  console.log("\n--- Collisions ---");
  console.log(`  slug collisions: ${slugCollisions.length}`);
  console.log(`  CREATE slug collisions: ${createSlugCollisions.length}`);
  if (createSlugCollisions.length) {
    for (const c of createSlugCollisions.slice(0, 20)) {
      console.log(`    ${c.sku} → ${c.proposedSlug} (existing ${c.existingSku})`);
    }
  }
  console.log(`  brand case/spacing dupes in prod: ${brandCaseDupes.length}`);
  console.log(`  category case/spacing dupes in prod: ${categoryCaseDupes.length}`);

  console.log("\n--- Philips ---");
  for (const sku of PHILIPS_DUPLICATE_REVIEW) {
    const p = planned.find((x) => x.sku === sku);
    console.log(`  ${sku}: ${p?.action} slug=${p?.proposedSlug}`);
  }

  console.log(`\nDry-run report: ${OUT_PATH}`);
  console.log(`\n>>> ${finalReadiness} <<<\n`);
  console.log("No production writes performed. No commit/push/deploy.");

  if (finalReadiness !== "READY FOR PRODUCTION WRITE") process.exitCode = 1;
}

main().catch((error) => {
  console.error("Production dry-run failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
