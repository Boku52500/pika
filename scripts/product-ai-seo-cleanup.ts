/**
 * Surgical cleanup of the completed 458-product AI SEO manifest.
 * Does NOT regenerate the full catalogue. Does NOT write to the database.
 *
 * Usage:
 *   npm run products:ai-seo-cleanup -- "C:\\path\\products.xlsx"
 */
import fs from "node:fs/promises";
import path from "node:path";

import { auditAiManifest, printAuditReport, readinessAssessment } from "../src/lib/productImport/aiManifestAudit";
import { CONTENT_PROMPT_VERSION } from "../src/lib/productImport/aiCopywriterPrompt";
import {
  buildAiContentCacheKey,
  readAiContentCache,
  writeAiContentCache,
} from "../src/lib/productImport/aiContentCache";
import {
  AiProviderFatalError,
  describeMissingAiProvider,
  recomputeQualityFlags,
  resolveAiProviderConfig,
  rewriteCommercialClosingOnly,
  rewriteSeoTitleMetaOnly,
  splitCommercialClosing,
} from "../src/lib/productImport/aiProductContent";
import {
  writeAiSeoManifestFiles,
  type AiSeoManifest,
  type AiSeoManifestEntry,
} from "../src/lib/productImport/aiSeoManifest";
import { normalizeAiSlugSuggestion, resolveCompactProductSlugWithAiSuggestion } from "../src/lib/productImport/compactSlug";
import { parseAllExcelProducts } from "../src/lib/productImport/excelProducts";
import { parseProductFacts } from "../src/lib/productImport/parseProductFacts";
import { loadLocalEnv } from "./loadLocalEnv";

loadLocalEnv();

const CLOSING_OVERUSE_THRESHOLD = 12;
const KEEP_PER_OVERUSED_CLOSING = 4;

const GENERIC_SUFFIXES = [
  "processor",
  "tv",
  "air-conditioner",
  "gaming-router",
  "video-card",
  "graphics-card",
  "router",
  "cooler",
  "monitor",
  "laptop",
  "smartphone",
  "blender",
];

type SlugCategory = "A" | "B" | "C" | "D" | "E";

type CleanupReport = {
  duplicateBrandCleared: string[];
  seoDuplicateClassification: Array<{
    group: string;
    classification: "A" | "B" | "C" | "D";
    skus: string[];
    action: string;
  }>;
  seoFieldsRegenerated: string[];
  closingsRewritten: string[];
  slugsCategorized: Record<SlugCategory, Array<{ sku: string; slug: string; reasons: string[] }>>;
  slugsRewritten: Array<{ sku: string; from: string; to: string; categories: SlugCategory[] }>;
  productsTouched: string[];
  fieldsTouched: Record<string, string[]>;
  inventoryDuplicateReview: string[];
};

function supplierJunkInSlug(slug: string): boolean {
  return /\b(?:90ig|mu20|ct\d|va\d|b7jm|nggf)\b/i.test(slug) || /\b[a-z]{2}\d{5,}[a-z0-9]*\b/i.test(slug);
}

function duplicatedTokensInSlug(slug: string): boolean {
  const parts = slug.split("-").filter(Boolean);
  return new Set(parts).size !== parts.length;
}

function categorizeSuspiciousSlug(slug: string): { categories: SlugCategory[]; reasons: string[] } {
  const reasons: string[] = [];
  const categories = new Set<SlugCategory>();

  for (const suffix of GENERIC_SUFFIXES) {
    if (slug.endsWith(`-${suffix}`)) {
      reasons.push(`generic-suffix:${suffix}`);
      categories.add("B");
    }
  }
  if (supplierJunkInSlug(slug)) {
    reasons.push("supplier-code");
    categories.add("C");
  }
  if (duplicatedTokensInSlug(slug)) {
    reasons.push("duplicated-token");
    categories.add("D");
  }
  if (slug.length > 60) {
    reasons.push("length>60");
    categories.add("E");
  }

  if (!categories.size && reasons.length === 0) {
    // Harmless descriptive leftovers (kept for reporting only)
    categories.add("A");
  }
  return { categories: [...categories], reasons };
}

function stripGenericSuffixes(slug: string): string {
  let next = slug;
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of GENERIC_SUFFIXES) {
      if (next.endsWith(`-${suffix}`)) {
        next = next.slice(0, -(suffix.length + 1));
        changed = true;
      }
    }
  }
  return next.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

function dedupeSlugTokens(slug: string): string {
  const seen = new Set<string>();
  return slug
    .split("-")
    .filter(Boolean)
    .filter((part) => {
      if (seen.has(part)) return false;
      seen.add(part);
      return true;
    })
    .join("-");
}

function stripSupplierishTokens(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .filter((part) => !/^(?:90ig|mu20|b7jm|nggf)$/i.test(part))
    .filter((part) => !/^ct\d{4,}/i.test(part) && !/^va\d{4,}/i.test(part))
    .join("-");
}

async function updateCacheForEntry(entry: AiSeoManifestEntry): Promise<void> {
  const cacheKey = buildAiContentCacheKey({
    sku: entry.sku,
    name: entry.productName,
    brand: entry.brand,
    category: entry.category,
  });
  const existing = await readAiContentCache(cacheKey);
  await writeAiContentCache({
    cacheKey,
    promptVersion: CONTENT_PROMPT_VERSION,
    sku: entry.sku,
    name: entry.productName,
    brand: entry.brand,
    category: entry.category,
    generatedAt: new Date().toISOString(),
    model: entry.model,
    tokenUsage: entry.tokenUsage,
    content: {
      shortDescription: entry.aiShortDescription,
      fullDescription: entry.aiFullDescription,
      seoTitle: entry.aiSeoTitle,
      seoDescription: entry.aiSeoDescription,
      slugSuggestion: entry.aiSlugSuggestion,
    },
    aiSlugSuggestion: entry.aiSlugSuggestion,
    finalSlug: entry.finalValidatedSlug,
    qualityFlags: entry.qualityFlags,
    generationStatus: "success",
    error: existing?.error,
  });
}

function markTouched(
  report: CleanupReport,
  sku: string,
  fields: string[],
): void {
  if (!report.productsTouched.includes(sku)) report.productsTouched.push(sku);
  const prev = report.fieldsTouched[sku] ?? [];
  report.fieldsTouched[sku] = [...new Set([...prev, ...fields])];
}

function lastClosing(full: string): string {
  return splitCommercialClosing(full).closing.trim();
}

function closingKey(full: string): string {
  return lastClosing(full).toLowerCase();
}

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv.find((a) => a && !a.startsWith("--"));
  if (!fileArg) {
    console.error('Usage: npm run products:ai-seo-cleanup -- "C:\\path\\products.xlsx"');
    process.exit(1);
  }

  const config = resolveAiProviderConfig();
  if (!config) {
    console.error(describeMissingAiProvider());
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  const manifestPath = path.join(process.cwd(), "tmp", "product-seo-ai-review.json");
  const partialPath = path.join(process.cwd(), "tmp", "product-seo-ai-cleanup-partial.json");
  const cleanupReportPath = path.join(process.cwd(), "tmp", "product-seo-ai-cleanup-report.json");

  let manifest: AiSeoManifest;
  let report: CleanupReport;
  let resumeClosingsOnly = false;

  try {
    const partialRaw = await fs.readFile(partialPath, "utf8");
    const partial = JSON.parse(partialRaw) as { report: CleanupReport; manifest: AiSeoManifest };
    if (partial.manifest?.entries?.length === 458 && partial.report) {
      manifest = partial.manifest;
      report = {
        ...partial.report,
        slugsCategorized: partial.report.slugsCategorized ?? { A: [], B: [], C: [], D: [], E: [] },
        slugsRewritten: partial.report.slugsRewritten ?? [],
        closingsRewritten: partial.report.closingsRewritten ?? [],
        productsTouched: partial.report.productsTouched ?? [],
        fieldsTouched: partial.report.fieldsTouched ?? {},
        inventoryDuplicateReview: partial.report.inventoryDuplicateReview ?? [],
        duplicateBrandCleared: partial.report.duplicateBrandCleared ?? [],
        seoDuplicateClassification: partial.report.seoDuplicateClassification ?? [],
        seoFieldsRegenerated: partial.report.seoFieldsRegenerated ?? [],
      };
      resumeClosingsOnly = true;
      console.log(`\nResuming from partial cleanup (${report.closingsRewritten.length} closings already rewritten).\n`);
    } else {
      throw new Error("partial incomplete");
    }
  } catch {
    const raw = await fs.readFile(manifestPath, "utf8");
    manifest = JSON.parse(raw) as AiSeoManifest;
    report = {
      duplicateBrandCleared: [],
      seoDuplicateClassification: [],
      seoFieldsRegenerated: [],
      closingsRewritten: [],
      slugsCategorized: { A: [], B: [], C: [], D: [], E: [] },
      slugsRewritten: [],
      productsTouched: [],
      fieldsTouched: {},
      inventoryDuplicateReview: [],
    };
  }

  const excelRows = parseAllExcelProducts(filePath);
  const excelBySku = new Map(excelRows.map((r) => [r.sku, r]));

  const persistPartial = async () => {
    await fs.writeFile(partialPath, JSON.stringify({ report, manifest }, null, 2), "utf8");
    await writeAiSeoManifestFiles(manifest);
  };

  const started = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;

  const addUsage = (u: { promptTokens: number; completionTokens: number; totalTokens: number } | null) => {
    if (!u) return;
    promptTokens += u.promptTokens;
    completionTokens += u.completionTokens;
    totalTokens += u.totalTokens;
  };

  console.log("\n=== AI SEO Manifest Surgical Cleanup ===\n");
  console.log(`Prompt version: ${CONTENT_PROMPT_VERSION}`);
  console.log(`Model: ${config.model}`);
  console.log(`Entries: ${manifest.entries.length}`);
  console.log(`Resume closings-only: ${resumeClosingsOnly}\n`);

  if (!resumeClosingsOnly) {
    // -------------------------------------------------------------------------
    // 1) Clear false-positive DUPLICATE_BRAND flags (detector fixed)
    // -------------------------------------------------------------------------
    console.log("--- 1) DUPLICATE_BRAND false-positive cleanup ---");
    for (const entry of manifest.entries) {
      const had = entry.qualityFlags.some((f) => f.code === "DUPLICATE_BRAND");
      if (!had) continue;
      const qualityInput = {
        sku: entry.sku,
        productName: entry.productName,
        brand: entry.brand,
        category: entry.category,
        currentSlug: entry.currentSlug,
        proposedSlug: entry.finalValidatedSlug,
        proposedShortDescription: entry.aiShortDescription,
        proposedFullDescription: entry.aiFullDescription,
        proposedSeoTitle: entry.aiSeoTitle,
        proposedSeoDescription: entry.aiSeoDescription,
      };
      const recomputed = recomputeQualityFlags(qualityInput, [qualityInput]);
      const still = recomputed.some((f) => f.code === "DUPLICATE_BRAND");
      if (!still) {
        entry.qualityFlags = entry.qualityFlags.filter((f) => f.code !== "DUPLICATE_BRAND");
        report.duplicateBrandCleared.push(entry.sku);
        markTouched(report, entry.sku, ["qualityFlags"]);
        await updateCacheForEntry(entry);
        console.log(`  cleared false-positive DUPLICATE_BRAND: ${entry.sku}`);
      } else {
        console.log(`  STILL has DUPLICATE_BRAND (needs content regen): ${entry.sku}`);
      }
    }

    // -------------------------------------------------------------------------
    // 2) Investigate + fix SEO title/meta duplicates
    // -------------------------------------------------------------------------
    console.log("\n--- 2) Duplicate SEO investigation ---");
    const byTitle = new Map<string, AiSeoManifestEntry[]>();
    const byMeta = new Map<string, AiSeoManifestEntry[]>();
    for (const e of manifest.entries) {
      const t = byTitle.get(e.aiSeoTitle) ?? [];
      t.push(e);
      byTitle.set(e.aiSeoTitle, t);
      const m = byMeta.get(e.aiSeoDescription) ?? [];
      m.push(e);
      byMeta.set(e.aiSeoDescription, m);
    }

    const handledTitleGroups = new Set<string>();
    for (const [title, group] of byTitle) {
      if (group.length < 2) continue;
      handledTitleGroups.add(title);
      const facts = group.map((e) => {
        const excel = excelBySku.get(e.sku);
        return {
          sku: e.sku,
          name: e.productName,
          brand: e.brand,
          category: e.category,
          price: excel?.price ?? null,
          cleanName: e.sourceFacts.cleanName,
          modelLabel: e.sourceFacts.modelLabel,
          explicitFacts: e.sourceFacts.explicitFacts,
        };
      });
      console.log(`\n  Title group (${group.length}): ${title}`);
      for (const f of facts) {
        console.log(
          `    ${f.sku} | ${f.name} | price=${f.price} | model=${f.modelLabel} | facts=${JSON.stringify(f.explicitFacts)}`,
        );
      }

      const names = new Set(group.map((e) => e.productName.replace(/\s+/g, " ").trim().toLowerCase()));
      const modelLabels = new Set(group.map((e) => e.sourceFacts.modelLabel.toLowerCase()));
      const prices = new Set(group.map((e) => excelBySku.get(e.sku)?.price ?? ""));

      const isDelonghiVariant =
        group.every((e) => /PrimaDonna Aromatic/i.test(e.productName)) && modelLabels.size > 1;

      const isPhilipsSameProduct =
        group.every((e) => /MG7951\/15/i.test(e.productName)) &&
        modelLabels.size === 1 &&
        prices.size === 1;

      if (isDelonghiVariant) {
        report.seoDuplicateClassification.push({
          group: title,
          classification: "C",
          skus: group.map((e) => e.sku),
          action: "regenerate unique SEO title/meta including model code",
        });
        const avoidTitles = group.map((e) => e.aiSeoTitle);
        const avoidMetas = group.map((e) => e.aiSeoDescription);
        for (const entry of group) {
          const modelCode = (entry.productName.match(/ECAM[\d.]+[A-Z]*/i) ?? [
            entry.sourceFacts.modelLabel,
          ])[0]!;
          try {
            const rewritten = await rewriteSeoTitleMetaOnly({
              config,
              sku: entry.sku,
              productName: entry.productName,
              brand: entry.brand,
              category: entry.category,
              shortDescription: entry.aiShortDescription,
              fullDescription: entry.aiFullDescription,
              currentSeoTitle: entry.aiSeoTitle,
              currentSeoDescription: entry.aiSeoDescription,
              mustIncludeTokens: [modelCode],
              avoidExactTitles: avoidTitles.filter((t) => t !== entry.aiSeoTitle),
              avoidExactMetas: avoidMetas.filter((t) => t !== entry.aiSeoDescription),
            });
            addUsage(rewritten.tokenUsage);
            entry.aiSeoTitle = rewritten.seoTitle;
            entry.aiSeoDescription = rewritten.seoDescription;
            report.seoFieldsRegenerated.push(entry.sku);
            markTouched(report, entry.sku, ["aiSeoTitle", "aiSeoDescription"]);
            await updateCacheForEntry(entry);
            console.log(`    regenerated SEO for ${entry.sku}: ${entry.aiSeoTitle}`);
          } catch (err) {
            if (err instanceof AiProviderFatalError) throw err;
            console.error(`    SEO rewrite failed for ${entry.sku}:`, err);
          }
        }
      } else if (isPhilipsSameProduct || (names.size === 1 && modelLabels.size === 1 && prices.size === 1)) {
        const classification = names.size <= 1 && modelLabels.size === 1 ? "B" : "A";
        report.seoDuplicateClassification.push({
          group: title,
          classification,
          skus: group.map((e) => e.sku),
          action: "flag for product-level duplicate review before import (no invented SEO differentiation)",
        });
        for (const e of group) {
          if (!report.inventoryDuplicateReview.includes(e.sku)) {
            report.inventoryDuplicateReview.push(e.sku);
          }
        }
        console.log(`    classified as ${classification} — flagged for inventory review, SEO left unchanged`);
      } else if (modelLabels.size > 1 || names.size > 1) {
        report.seoDuplicateClassification.push({
          group: title,
          classification: "C",
          skus: group.map((e) => e.sku),
          action: "regenerate unique SEO from distinguishing source tokens",
        });
        const avoidTitles = group.map((e) => e.aiSeoTitle);
        const avoidMetas = group.map((e) => e.aiSeoDescription);
        for (const entry of group) {
          const tokens = [
            ...entry.sourceFacts.explicitFacts.slice(0, 3),
            entry.sourceFacts.modelLabel,
          ].filter(Boolean);
          try {
            const rewritten = await rewriteSeoTitleMetaOnly({
              config,
              sku: entry.sku,
              productName: entry.productName,
              brand: entry.brand,
              category: entry.category,
              shortDescription: entry.aiShortDescription,
              fullDescription: entry.aiFullDescription,
              currentSeoTitle: entry.aiSeoTitle,
              currentSeoDescription: entry.aiSeoDescription,
              mustIncludeTokens: tokens.slice(0, 2),
              avoidExactTitles: avoidTitles.filter((t) => t !== entry.aiSeoTitle),
              avoidExactMetas: avoidMetas.filter((t) => t !== entry.aiSeoDescription),
            });
            addUsage(rewritten.tokenUsage);
            entry.aiSeoTitle = rewritten.seoTitle;
            entry.aiSeoDescription = rewritten.seoDescription;
            report.seoFieldsRegenerated.push(entry.sku);
            markTouched(report, entry.sku, ["aiSeoTitle", "aiSeoDescription"]);
            await updateCacheForEntry(entry);
            console.log(`    regenerated SEO for ${entry.sku}`);
          } catch (err) {
            if (err instanceof AiProviderFatalError) throw err;
            console.error(`    SEO rewrite failed for ${entry.sku}:`, err);
          }
        }
      } else {
        report.seoDuplicateClassification.push({
          group: title,
          classification: "B",
          skus: group.map((e) => e.sku),
          action: "flag for product-level duplicate review",
        });
        for (const e of group) {
          if (!report.inventoryDuplicateReview.includes(e.sku)) report.inventoryDuplicateReview.push(e.sku);
        }
      }
    }

    for (const [meta, group] of byMeta) {
      if (group.length < 2) continue;
      if (group.every((e) => handledTitleGroups.has(e.aiSeoTitle))) continue;
      const modelLabels = new Set(group.map((e) => e.sourceFacts.modelLabel.toLowerCase()));
      const prices = new Set(group.map((e) => excelBySku.get(e.sku)?.price ?? ""));
      if (modelLabels.size === 1 && prices.size === 1) {
        report.seoDuplicateClassification.push({
          group: meta.slice(0, 80),
          classification: "B",
          skus: group.map((e) => e.sku),
          action: "flag for product-level duplicate review (duplicate meta)",
        });
        for (const e of group) {
          if (!report.inventoryDuplicateReview.includes(e.sku)) report.inventoryDuplicateReview.push(e.sku);
        }
      }
    }
  } else {
    console.log("--- 1/2) Skipped (already completed in partial) ---");
  }

  // -------------------------------------------------------------------------
  // 3) Commercial closing diversity pass
  // -------------------------------------------------------------------------
  console.log("\n--- 3) Commercial closing diversity ---");
  const closingMap = new Map<string, string[]>();
  for (const e of manifest.entries) {
    const key = closingKey(e.aiFullDescription);
    if (key.length < 20) continue;
    const list = closingMap.get(key) ?? [];
    list.push(e.sku);
    closingMap.set(key, list);
  }

  const overused = [...closingMap.entries()]
    .filter(([, skus]) => skus.length >= CLOSING_OVERUSE_THRESHOLD)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`Overused closings (>=${CLOSING_OVERUSE_THRESHOLD}): ${overused.length}`);
  for (const [sentence, skus] of overused) {
    console.log(`  ${skus.length}× ${sentence.slice(0, 70)}`);
  }

  const alreadyRewritten = new Set(report.closingsRewritten);
  const skusToRewriteClosing = new Set<string>();
  const avoidExactClosings = overused.map(([s]) => s);
  for (const [, skus] of overused) {
    for (const sku of skus.slice(KEEP_PER_OVERUSED_CLOSING)) {
      if (!alreadyRewritten.has(sku)) skusToRewriteClosing.add(sku);
    }
  }

  console.log(
    `Closings to rewrite this run: ${skusToRewriteClosing.size} (keeping ${KEEP_PER_OVERUSED_CLOSING} per overused pattern; already done: ${alreadyRewritten.size})`,
  );

  const peerClosingCounts: Record<string, number> = {};
  for (const [sentence, skus] of closingMap) {
    peerClosingCounts[sentence] = skus.length;
  }

  let closingDone = 0;
  for (const entry of manifest.entries) {
    if (!skusToRewriteClosing.has(entry.sku)) continue;
    closingDone += 1;
    process.stdout.write(`  [${closingDone}/${skusToRewriteClosing.size}] ${entry.sku} `);
    try {
      const rewritten = await rewriteCommercialClosingOnly({
        config,
        sku: entry.sku,
        productName: entry.productName,
        brand: entry.brand,
        category: entry.category,
        shortDescription: entry.aiShortDescription,
        fullDescription: entry.aiFullDescription,
        seoTitle: entry.aiSeoTitle,
        seoDescription: entry.aiSeoDescription,
        peerClosingCounts,
        reservedClosingsAvoid: avoidExactClosings,
      });
      addUsage(rewritten.tokenUsage);
      if (rewritten.fullDescription !== entry.aiFullDescription) {
        entry.aiFullDescription = rewritten.fullDescription;
        if (!report.closingsRewritten.includes(entry.sku)) report.closingsRewritten.push(entry.sku);
        markTouched(report, entry.sku, ["aiFullDescription"]);
        await updateCacheForEntry(entry);
        const newClosing = lastClosing(entry.aiFullDescription);
        peerClosingCounts[newClosing.toLowerCase()] = (peerClosingCounts[newClosing.toLowerCase()] ?? 0) + 1;
        console.log(`ok (retries=${rewritten.retries})`);
      } else {
        console.log(`unchanged`);
      }
      if (closingDone % 25 === 0) {
        await persistPartial();
        console.log(`  (checkpoint saved: ${report.closingsRewritten.length} closings)`);
      }
    } catch (err) {
      if (err instanceof AiProviderFatalError) {
        console.error("\n\n=== AI Provider Fatal Error — stopping cleanup ===\n");
        console.error(err.message);
        console.error("Partial progress preserved. Re-run the same command to resume.");
        await persistPartial();
        process.exit(1);
      }
      console.log(`FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // -------------------------------------------------------------------------
  // 4) Slug cleanup for B/C/D/E only
  // -------------------------------------------------------------------------
  console.log("\n--- 4) Slug categorization + B/C/D/E cleanup ---");
  const reserved = new Set(manifest.entries.map((e) => e.finalValidatedSlug));

  for (const entry of manifest.entries) {
    const { categories, reasons } = categorizeSuspiciousSlug(entry.finalValidatedSlug);
    // Only record if there is something to review (non-empty reasons or B-E)
    const needsReview = categories.some((c) => c !== "A") || reasons.length > 0;
    if (!needsReview) continue;
    for (const cat of categories) {
      report.slugsCategorized[cat].push({
        sku: entry.sku,
        slug: entry.finalValidatedSlug,
        reasons,
      });
    }
  }

  // Harmless A: suffixes that are category-descriptive but not in GENERIC list after model clarity —
  // we only auto-fix B/C/D/E.
  const slugFixSkus = new Set<string>();
  for (const cat of ["B", "C", "D", "E"] as SlugCategory[]) {
    for (const item of report.slugsCategorized[cat]) slugFixSkus.add(item.sku);
  }

  for (const entry of manifest.entries) {
    if (!slugFixSkus.has(entry.sku)) continue;
    const from = entry.finalValidatedSlug;
    reserved.delete(from);

    let candidate = from;
    const cats = categorizeSuspiciousSlug(from).categories;
    if (cats.includes("B")) candidate = stripGenericSuffixes(candidate);
    if (cats.includes("D")) candidate = dedupeSlugTokens(candidate);
    if (cats.includes("C")) candidate = stripSupplierishTokens(candidate);

    const facts = parseProductFacts({
      sku: entry.sku,
      name: entry.productName,
      brand: entry.brand,
      category: entry.category,
    });
    const normalized = normalizeAiSlugSuggestion(candidate || entry.aiSlugSuggestionNormalized, facts);
    const { slug: resolved } = resolveCompactProductSlugWithAiSuggestion(
      { sku: entry.sku, name: entry.productName, brand: entry.brand, category: entry.category },
      normalized,
      reserved,
    );
    reserved.add(resolved);

    if (resolved !== from) {
      entry.finalValidatedSlug = resolved;
      entry.aiSlugSuggestionNormalized = normalized;
      report.slugsRewritten.push({ sku: entry.sku, from, to: resolved, categories: cats });
      markTouched(report, entry.sku, ["finalValidatedSlug"]);
      await updateCacheForEntry(entry);
      console.log(`  slug ${entry.sku}: ${from} → ${resolved}`);
    } else {
      reserved.add(from);
    }
  }

  console.log(`Slugs rewritten: ${report.slugsRewritten.length}`);
  console.log(
    `Slug categories: A=${report.slugsCategorized.A.length} B=${report.slugsCategorized.B.length} C=${report.slugsCategorized.C.length} D=${report.slugsCategorized.D.length} E=${report.slugsCategorized.E.length}`,
  );

  // -------------------------------------------------------------------------
  // 5) Recompute quality flags catalogue-wide
  // -------------------------------------------------------------------------
  console.log("\n--- 5) Recompute quality flags ---");
  const qualityPeers = manifest.entries.map((e) => ({
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
  for (const entry of manifest.entries) {
    const peer = qualityPeers.find((p) => p.sku === entry.sku)!;
    entry.qualityFlags = recomputeQualityFlags(peer, qualityPeers).filter((f) => f.sku === entry.sku);
  }

  // -------------------------------------------------------------------------
  // 6) Write updated manifests + audit
  // -------------------------------------------------------------------------
  const generationTimeMs = Date.now() - started;
  manifest.generatedAt = new Date().toISOString();
  manifest.promptVersion = CONTENT_PROMPT_VERSION;
  // Preserve original total tokens; append cleanup usage into a note via audit file

  const paths = await writeAiSeoManifestFiles(manifest);
  const retriedSkus = manifest.entries.filter((e) => e.retries > 0).map((e) => e.sku);
  const audit = auditAiManifest(manifest.entries, retriedSkus);
  const decision = readinessAssessment(
    manifest.entries,
    audit,
    manifest.failedSkus ?? manifest.entries.filter((e) => e.generationStatus === "failed").map((e) => e.sku),
  );

  const auditPath = path.join(process.cwd(), "tmp", "product-seo-ai-audit.json");
  await fs.writeFile(
    auditPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cleanup: {
          ...report,
          cleanupDurationMs: generationTimeMs,
          cleanupTokenUsage: { promptTokens, completionTokens, totalTokens },
        },
        audit,
        readiness: decision,
      },
      null,
      2,
    ),
    "utf8",
  );

  await fs.writeFile(cleanupReportPath, JSON.stringify({ report, readiness: decision }, null, 2), "utf8");
  try {
    await fs.unlink(partialPath);
  } catch {
    // no partial to remove
  }

  printAuditReport(audit);

  console.log("\n=== CLEANUP SUMMARY ===\n");
  console.log(`Products touched: ${report.productsTouched.length}`);
  console.log(`DUPLICATE_BRAND cleared: ${report.duplicateBrandCleared.join(", ") || "(none)"}`);
  console.log(`SEO fields regenerated: ${report.seoFieldsRegenerated.join(", ") || "(none)"}`);
  console.log(`Closings rewritten: ${report.closingsRewritten.length}`);
  console.log(`Slugs rewritten: ${report.slugsRewritten.length}`);
  console.log(`Inventory duplicate review SKUs: ${report.inventoryDuplicateReview.join(", ") || "(none)"}`);
  console.log(`Cleanup tokens: ${totalTokens} (prompt ${promptTokens} / completion ${completionTokens})`);
  console.log(`Cleanup time: ${(generationTimeMs / 1000 / 60).toFixed(1)} min`);
  console.log(`\nManifest: ${paths.jsonPath}`);
  console.log(`Audit: ${auditPath}`);
  console.log(`\n>>> ${decision} <<<\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
