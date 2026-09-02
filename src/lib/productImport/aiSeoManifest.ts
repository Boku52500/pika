import fs from "node:fs/promises";
import path from "node:path";

import * as XLSX from "xlsx";

import type { AiGeneratedProductContent } from "./aiProductContent";
import type { ContentQualityReport, SeoManifestEntry } from "./contentQuality";

export type AiSeoManifestEntry = {
  sku: string;
  productName: string;
  brand: string;
  category: string;
  sourceFacts: AiGeneratedProductContent["sourceFacts"];
  currentSlug: string | null;
  aiSlugSuggestion: string;
  aiSlugSuggestionNormalized: string;
  finalValidatedSlug: string;
  aiShortDescription: string;
  aiFullDescription: string;
  aiSeoTitle: string;
  aiSeoDescription: string;
  qualityFlags: AiGeneratedProductContent["qualityFlags"];
  generationStatus: AiGeneratedProductContent["generationStatus"];
  model: string;
  tokenUsage: AiGeneratedProductContent["tokenUsage"];
  retries: number;
  error?: string;
};

export type AiSeoManifest = {
  generatedAt: string;
  sourceFile: string;
  promptVersion: string;
  model: string;
  productCount: number;
  generationTimeMs: number;
  totalTokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  entries: AiSeoManifestEntry[];
  quality: ContentQualityReport;
  failedSkus: string[];
};

export function aiResultsToManifestEntries(results: AiGeneratedProductContent[]): AiSeoManifestEntry[] {
  return results.map((r) => ({
    sku: r.sku,
    productName: r.sourceFacts.productName,
    brand: r.sourceFacts.brand,
    category: r.sourceFacts.category,
    sourceFacts: r.sourceFacts,
    currentSlug: null,
    aiSlugSuggestion: r.aiSlugSuggestion,
    aiSlugSuggestionNormalized: r.aiSlugSuggestionNormalized,
    finalValidatedSlug: r.finalSlug,
    aiShortDescription: r.content.shortDescription,
    aiFullDescription: r.content.fullDescription,
    aiSeoTitle: r.content.seoTitle,
    aiSeoDescription: r.content.seoDescription,
    qualityFlags: r.qualityFlags,
    generationStatus: r.generationStatus,
    model: r.model,
    tokenUsage: r.tokenUsage,
    retries: r.retries,
    error: r.error,
  }));
}

export function manifestEntriesToQualityInput(entries: AiSeoManifestEntry[]): SeoManifestEntry[] {
  return entries
    .filter((e) => e.generationStatus === "success" || e.generationStatus === "cached")
    .map((e) => ({
      sku: e.sku,
      productName: e.productName,
      brand: e.brand,
      category: e.category,
      currentSlug: e.currentSlug,
      proposedSlug: e.finalValidatedSlug,
      proposedShortDescription: e.aiShortDescription,
      proposedFullDescription: e.aiFullDescription,
      proposedSeoTitle: e.aiSeoTitle,
      proposedSeoDescription: e.aiSeoDescription,
    }));
}

export async function writeAiSeoManifestFiles(
  manifest: AiSeoManifest,
  outDir = path.join(process.cwd(), "tmp"),
): Promise<{ jsonPath: string; csvPath: string; xlsxPath: string }> {
  await fs.mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "product-seo-ai-review.json");
  await fs.writeFile(jsonPath, JSON.stringify(manifest, null, 2), "utf8");

  const headers = [
    "SKU",
    "Name",
    "Brand",
    "Category",
    "Source Facts",
    "Old Slug",
    "AI Proposed Slug",
    "Final Validated Slug",
    "AI Short Description",
    "AI Full Description",
    "AI SEO Title",
    "AI SEO Description",
    "Quality Flags",
    "Generation Status",
  ];

  const rows = manifest.entries.map((e) => [
    e.sku,
    e.productName,
    e.brand,
    e.category,
    JSON.stringify(e.sourceFacts),
    e.currentSlug ?? "",
    e.aiSlugSuggestion,
    e.finalValidatedSlug,
    e.aiShortDescription,
    e.aiFullDescription,
    e.aiSeoTitle,
    e.aiSeoDescription,
    e.qualityFlags.map((f) => `${f.code}:${f.message}`).join(" | "),
    e.generationStatus,
  ]);

  const csvPath = path.join(outDir, "product-seo-ai-review.csv");
  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => csvEscape(String(c))).join(","))].join("\n");
  await fs.writeFile(csvPath, `\uFEFF${csv}`, "utf8");

  const xlsxPath = path.join(outDir, "product-seo-ai-review.xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "AI SEO Review");
  XLSX.writeFile(wb, xlsxPath);

  return { jsonPath, csvPath, xlsxPath };
}
