import fs from "node:fs/promises";
import path from "node:path";

import * as XLSX from "xlsx";

import { resolveCompactProductSlug } from "./compactSlug";
import { composeProductContent } from "./composeProductContent";
import { analyzeContentQuality, type ContentQualityReport, type SeoManifestEntry } from "./contentQuality";
import { parseAllExcelProducts, type ExcelProductRow } from "./excelProducts";

export type SeoManifest = {
  generatedAt: string;
  sourceFile: string;
  productCount: number;
  entries: SeoManifestEntry[];
  quality: ContentQualityReport;
};

export type BuildSeoManifestOptions = {
  filePath: string;
  currentSlugsBySku?: Map<string, string>;
  /** Slugs reserved for non-Excel seeded products — do not collide. */
  reservedSlugs?: Set<string>;
};

function categoryKindFromLabel(category: string): string {
  const c = category.toLocaleLowerCase("ka");
  if (/პროცეს|cpu/.test(c)) return "cpu";
  if (/მონიტ/.test(c)) return "monitor";
  if (/ტელევ/.test(c)) return "tv";
  if (/ლეპტ/.test(c)) return "laptop";
  if (/ტელეფ/.test(c)) return "phone";
  if (/ssd|hdd|მეხს/.test(c)) return "storage";
  if (/ვიდეო|gpu|კარტ/.test(c)) return "gpu";
  return "other";
}

/** Stratified 50-product sample for human review. */
export function selectReviewSample(entries: SeoManifestEntry[], categories: ExcelProductRow[]): SeoManifestEntry[] {
  const byKind = new Map<string, SeoManifestEntry[]>();
  const skuToCategory = new Map(categories.map((c) => [c.sku, c.category]));

  for (const entry of entries) {
    const cat = skuToCategory.get(entry.sku) ?? entry.category;
    const kind = categoryKindFromLabel(cat);
    const list = byKind.get(kind) ?? [];
    list.push(entry);
    byKind.set(kind, list);
  }

  const pick = (kind: string, n: number) => (byKind.get(kind) ?? []).slice(0, n);
  const sample: SeoManifestEntry[] = [];
  const quotas: Array<[string, number]> = [
    ["cpu", 5],
    ["monitor", 5],
    ["tv", 5],
    ["laptop", 5],
    ["phone", 5],
    ["storage", 5],
    ["gpu", 5],
  ];

  for (const [kind, n] of quotas) {
    for (const entry of pick(kind, n)) {
      if (!sample.some((s) => s.sku === entry.sku)) sample.push(entry);
    }
  }

  for (const entry of entries) {
    if (sample.length >= 50) break;
    if (!sample.some((s) => s.sku === entry.sku)) sample.push(entry);
  }

  return sample.slice(0, 50);
}

export function buildSeoManifest(options: BuildSeoManifestOptions): SeoManifest {
  const products = parseAllExcelProducts(options.filePath);
  const reserved = new Set(options.reservedSlugs ?? []);
  const entries: SeoManifestEntry[] = [];

  for (const row of products) {
    const content = composeProductContent(row);
    const { slug } = resolveCompactProductSlug(row, reserved);
    reserved.add(slug);

    entries.push({
      sku: row.sku,
      productName: row.name,
      brand: row.brand,
      category: row.category,
      currentSlug: options.currentSlugsBySku?.get(row.sku) ?? null,
      proposedSlug: slug,
      proposedShortDescription: content.shortDescription,
      proposedFullDescription: content.fullDescription,
      proposedSeoTitle: content.seoTitle,
      proposedSeoDescription: content.seoDescription,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(options.filePath),
    productCount: entries.length,
    entries,
    quality: analyzeContentQuality(entries),
  };
}

export async function writeSeoManifestFiles(manifest: SeoManifest, outDir = path.join(process.cwd(), "tmp")): Promise<{
  jsonPath: string;
  csvPath: string;
  xlsxPath: string;
}> {
  await fs.mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "product-seo-review.json");
  await fs.writeFile(jsonPath, JSON.stringify(manifest, null, 2), "utf8");

  const headers = [
    "SKU",
    "Product Name",
    "Brand",
    "Category",
    "Current Slug",
    "Proposed Slug",
    "Proposed Short Description",
    "Proposed Full Description",
    "Proposed SEO Title",
    "Proposed SEO Description",
  ];

  const rows = manifest.entries.map((e) => [
    e.sku,
    e.productName,
    e.brand,
    e.category,
    e.currentSlug ?? "",
    e.proposedSlug,
    e.proposedShortDescription,
    e.proposedFullDescription,
    e.proposedSeoTitle,
    e.proposedSeoDescription,
  ]);

  const csvPath = path.join(outDir, "product-seo-review.csv");
  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => csvEscape(String(c))).join(","))].join("\n");
  await fs.writeFile(csvPath, `\uFEFF${csv}`, "utf8");

  const xlsxPath = path.join(outDir, "product-seo-review.xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "SEO Review");
  XLSX.writeFile(wb, xlsxPath);

  return { jsonPath, csvPath, xlsxPath };
}
