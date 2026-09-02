/**
 * One-shot local generator: Excel + approved AI manifest → versioned import dataset.
 * Not used on Vercel. Output is committed under data/product-catalogue-import/.
 */
import fs from "node:fs";
import path from "node:path";

import { parseAllExcelProducts } from "../src/lib/productImport/excelProducts";

const excelPath = process.argv[2];
const manifestPath = process.argv[3] ?? path.join(process.cwd(), "tmp", "product-seo-ai-review.json");
const outPath =
  process.argv[4] ??
  path.join(process.cwd(), "data", "product-catalogue-import", "approved-catalogue-v1.json");

if (!excelPath) {
  console.error(
    'Usage: npx tsx scripts/generate-approved-catalogue-dataset.ts "C:\\\\path\\\\products.xlsx"',
  );
  process.exit(1);
}

type ManifestEntry = {
  sku: string;
  generationStatus: string;
  finalValidatedSlug: string;
  aiShortDescription: string;
  aiFullDescription: string;
  aiSeoTitle: string;
  aiSeoDescription: string;
};

const excel = parseAllExcelProducts(path.resolve(excelPath));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  entries: ManifestEntry[];
};
const bySku = new Map(manifest.entries.map((e) => [e.sku, e]));

if (excel.length !== 458) throw new Error(`Expected 458 Excel rows, got ${excel.length}`);

const products = excel.map((row) => {
  const entry = bySku.get(row.sku);
  if (!entry || entry.generationStatus === "failed") {
    throw new Error(`Missing/failed manifest for SKU ${row.sku}`);
  }
  return {
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    category: row.category,
    price: row.price,
    slug: entry.finalValidatedSlug,
    shortDescription: entry.aiShortDescription,
    fullDescription: entry.aiFullDescription,
    seoTitle: entry.aiSeoTitle,
    seoDescription: entry.aiSeoDescription,
  };
});

const skuSet = new Set(products.map((p) => p.sku));
const slugSet = new Set(products.map((p) => p.slug));
if (skuSet.size !== 458) throw new Error("Duplicate SKU in dataset");
if (slugSet.size !== 458) throw new Error("Duplicate slug in dataset");

const payload = {
  version: "2026-09-02-v1",
  description:
    "Approved 458-product catalogue import payload for idempotent production sync. Excel authoritative for sku/name/brand/category/price; AI manifest authoritative for descriptions/SEO/slug. Contains no secrets.",
  generatedAt: new Date().toISOString(),
  productCount: products.length,
  philipsDuplicateReviewSkus: ["172492", "177053"],
  products,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
console.log(`Wrote ${outPath}`);
console.log(`products=${products.length} bytes=${fs.statSync(outPath).size}`);
