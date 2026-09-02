/**
 * Generate SEO content review manifest for all Excel products.
 * Does NOT write to database.
 *
 * Usage:
 *   npm run products:seo-manifest -- "C:\\path\\products.xlsx"
 */
import "dotenv/config";

import path from "node:path";

import {
  buildSeoManifest,
  selectReviewSample,
  writeSeoManifestFiles,
} from "../src/lib/productImport/seoManifest";
import { parseAllExcelProducts } from "../src/lib/productImport/excelProducts";
import { prisma } from "../src/server/prisma";

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv.find((a) => a && !a.startsWith("--"));
  if (!fileArg) {
    console.error('Usage: npm run products:seo-manifest -- "C:\\path\\products.xlsx"');
    process.exit(1);
  }
  const filePath = path.resolve(fileArg);

  const excelSkus = parseAllExcelProducts(filePath).map((r) => r.sku);
  const dbProducts = await prisma.product.findMany({
    where: { sku: { in: excelSkus } },
    select: { sku: true, slug: true },
  });
  const currentSlugsBySku = new Map(dbProducts.map((p) => [p.sku, p.slug]));

  const seededSlugs = await prisma.product.findMany({
    where: { sku: { notIn: excelSkus } },
    select: { slug: true },
  });
  const reservedSlugs = new Set(seededSlugs.map((p) => p.slug));

  const manifest = buildSeoManifest({ filePath, currentSlugsBySku, reservedSlugs });
  const paths = await writeSeoManifestFiles(manifest);
  const sample = selectReviewSample(manifest.entries, parseAllExcelProducts(filePath));

  console.log("\n=== Product SEO Manifest ===\n");
  console.log(`Products processed: ${manifest.productCount}`);
  console.log(`JSON: ${paths.jsonPath}`);
  console.log(`CSV:  ${paths.csvPath}`);
  console.log(`XLSX: ${paths.xlsxPath}`);

  const q = manifest.quality;
  console.log("\n--- Quality summary ---");
  console.log(`Duplicate short descriptions: ${q.duplicateShortDescriptions.length}`);
  console.log(`Duplicate full descriptions: ${q.duplicateFullDescriptions.length}`);
  console.log(`Duplicate SEO titles: ${q.duplicateSeoTitles.length}`);
  console.log(`Duplicate SEO descriptions: ${q.duplicateSeoDescriptions.length}`);
  console.log(`Duplicate proposed slugs: ${q.duplicateProposedSlugs.length}`);
  console.log(`Slug length avg old→new: ${q.slugLength.oldAvg} → ${q.slugLength.newAvg}`);
  console.log(`Longest proposed slug (${q.slugLength.longestLen}): ${q.slugLength.longest}`);
  console.log(`Quality flags: ${q.flags.length}`);

  console.log("\n--- 50-product review sample ---\n");
  for (const entry of sample) {
    console.log(`SKU: ${entry.sku}`);
    console.log(`Name: ${entry.productName}`);
    console.log(`Category: ${entry.category}`);
    console.log(`Slug: ${entry.currentSlug ?? "(none)"} → ${entry.proposedSlug}`);
    console.log(`Short: ${entry.proposedShortDescription}`);
    console.log(`Full: ${entry.proposedFullDescription.split("\n\n")[0]}...`);
    console.log(`SEO title: ${entry.proposedSeoTitle}`);
    console.log(`SEO desc: ${entry.proposedSeoDescription}`);
    console.log("---");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
