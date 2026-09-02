/**
 * Generate AI-authored SEO content for 10 diverse Excel products (preview batch).
 * Does NOT write to database.
 *
 * Usage:
 *   npm run products:ai-seo-test -- "C:\\path\\products.xlsx"
 *
 * Requires OPENAI_API_KEY in .env.local (see script output if missing).
 */
import path from "node:path";

import { CONTENT_PROMPT_VERSION } from "../src/lib/productImport/aiCopywriterPrompt";
import { readAiProgress, writeAiProgress } from "../src/lib/productImport/aiContentCache";
import {
  aiResultsToManifestEntries,
  manifestEntriesToQualityInput,
  writeAiSeoManifestFiles,
  type AiSeoManifest,
} from "../src/lib/productImport/aiSeoManifest";
import {
  AiProviderFatalError,
  describeMissingAiProvider,
  generateAiProductContent,
  resolveAiProviderConfig,
} from "../src/lib/productImport/aiProductContent";
import { analyzeContentQuality } from "../src/lib/productImport/contentQuality";
import {
  analyzeCommercialRepetition,
  countCommercialKeywords,
  findMixedScriptViolations,
} from "../src/lib/productImport/validateAiClaims";
import { parseAllExcelProducts } from "../src/lib/productImport/excelProducts";
import { selectAiTestProducts } from "../src/lib/productImport/selectAiTestProducts";
import { loadLocalEnv } from "./loadLocalEnv";

loadLocalEnv();

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv.find((a) => a && !a.startsWith("--"));
  if (!fileArg) {
    console.error('Usage: npm run products:ai-seo-test -- "C:\\path\\products.xlsx"');
    process.exit(1);
  }

  const config = resolveAiProviderConfig();
  if (!config) {
    console.error("\n=== AI Provider Not Configured ===\n");
    console.error(describeMissingAiProvider());
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  const allRows = parseAllExcelProducts(filePath);
  const testRows = selectAiTestProducts(allRows);
  const reservedSlugs = new Set<string>();
  const started = Date.now();
  const results = [];
  const progress = await readAiProgress();

  console.log("\n=== AI Product SEO Test (10 products) ===\n");
  console.log(`Model: ${config.model}`);
  console.log(`Prompt version: ${CONTENT_PROMPT_VERSION}`);
  console.log(`Source: ${path.basename(filePath)}`);
  console.log(`Selected SKUs: ${testRows.map((r) => r.sku).join(", ")}\n`);

  const peerEntries = [];

  for (const row of testRows) {
    console.log(`Generating: ${row.sku} — ${row.name.slice(0, 60)}...`);
    try {
      const result = await generateAiProductContent(row, {
        config,
        reservedSlugs,
        peerEntries,
        useCache: true,
      });

      if (result.generationStatus === "success" || result.generationStatus === "cached") {
        peerEntries.push({
          sku: row.sku,
          productName: row.name,
          brand: row.brand,
          category: row.category,
          currentSlug: null,
          proposedSlug: result.finalSlug,
          proposedShortDescription: result.content.shortDescription,
          proposedFullDescription: result.content.fullDescription,
          proposedSeoTitle: result.content.seoTitle,
          proposedSeoDescription: result.content.seoDescription,
        });
        progress.completedSkus = [...new Set([...progress.completedSkus, row.sku])];
      } else {
        progress.failedSkus = [...progress.failedSkus.filter((f) => f.sku !== row.sku), { sku: row.sku, error: result.error ?? "failed" }];
      }

      results.push(result);
      await writeAiProgress(progress);
    } catch (err) {
      if (err instanceof AiProviderFatalError) {
        console.error("\n=== AI Provider Fatal Error — stopping batch ===\n");
        console.error(`Code: ${err.code}`);
        console.error(`Message: ${err.message}`);
        console.error("\nNo further products will be generated. Existing cache/progress preserved.");
        await writeAiProgress(progress);
        process.exit(1);
      }
      throw err;
    }
  }

  const generationTimeMs = Date.now() - started;
  const manifestEntries = aiResultsToManifestEntries(results);
  const qualityEntries = manifestEntriesToQualityInput(manifestEntries);

  const totalTokenUsage = results.reduce(
    (acc, r) => {
      if (!r.tokenUsage) return acc;
      return {
        promptTokens: acc.promptTokens + r.tokenUsage.promptTokens,
        completionTokens: acc.completionTokens + r.tokenUsage.completionTokens,
        totalTokens: acc.totalTokens + r.tokenUsage.totalTokens,
      };
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  );

  const manifest: AiSeoManifest = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(filePath),
    promptVersion: CONTENT_PROMPT_VERSION,
    model: config.model,
    productCount: manifestEntries.length,
    generationTimeMs,
    totalTokenUsage,
    entries: manifestEntries,
    quality: analyzeContentQuality(qualityEntries),
    failedSkus: results.filter((r) => r.generationStatus === "failed").map((r) => r.sku),
  };

  const paths = await writeAiSeoManifestFiles(manifest);

  console.log("\n--- Manifest files ---");
  console.log(`JSON: ${paths.jsonPath}`);
  console.log(`CSV:  ${paths.csvPath}`);
  console.log(`XLSX: ${paths.xlsxPath}`);

  console.log("\n--- Generation stats ---");
  console.log(`Time: ${(generationTimeMs / 1000).toFixed(1)}s`);
  console.log(`Tokens: prompt=${totalTokenUsage.promptTokens} completion=${totalTokenUsage.completionTokens} total=${totalTokenUsage.totalTokens}`);
  console.log(`Failed: ${manifest.failedSkus.length}`);

  console.log("\n--- Quality summary ---");
  const q = manifest.quality;
  console.log(`Quality flags: ${q.flags.length}`);
  console.log(`Duplicate short: ${q.duplicateShortDescriptions.length}`);
  console.log(`Duplicate full: ${q.duplicateFullDescriptions.length}`);
  console.log(`Duplicate SEO titles: ${q.duplicateSeoTitles.length}`);

  const allTexts = manifestEntries.flatMap((e) => [
    e.aiShortDescription,
    e.aiFullDescription,
    e.aiSeoTitle,
    e.aiSeoDescription,
  ]);
  const keywordCounts = countCommercialKeywords(allTexts);
  console.log("\n--- Commercial keyword occurrence counts (all 10 products) ---");
  for (const [label, count] of Object.entries(keywordCounts)) {
    console.log(`${label}: ${count}`);
  }

  const mixedScript = findMixedScriptViolations(allTexts);
  console.log("\n--- Mixed-script Georgian violations ---");
  console.log(mixedScript.length ? mixedScript.join(", ") : "(none)");

  const repetition = analyzeCommercialRepetition(
    manifestEntries.map((e) => ({
      sku: e.sku,
      seoDescription: e.aiSeoDescription,
      fullDescription: e.aiFullDescription,
    })),
  );
  console.log("\n--- Repeated exact commercial sentences ---");
  if (repetition.exactSentences.length === 0) {
    console.log("(none)");
  } else {
    for (const item of repetition.exactSentences) {
      console.log(`SKUs ${item.skus.join(", ")}: "${item.sentence}"`);
    }
  }
  console.log("\n--- Repeated commercial sentence structures ---");
  if (repetition.structurePatterns.length === 0) {
    console.log("(none)");
  } else {
    for (const item of repetition.structurePatterns) {
      console.log(`SKUs ${item.skus.join(", ")}: [${item.pattern}]`);
    }
  }

  const totalRetries = results.reduce((sum, r) => sum + r.retries, 0);
  console.log("\n--- Retries ---");
  console.log(`Total quality retries across batch: ${totalRetries}`);
  for (const r of results) {
    if (r.retries > 0) console.log(`  ${r.sku}: ${r.retries} retries`);
  }

  console.log("\n=== FULL 10-PRODUCT AI OUTPUT ===\n");

  for (const entry of manifestEntries) {
    console.log(`SKU: ${entry.sku}`);
    console.log(`Exact source name: ${entry.productName}`);
    console.log(`Facts supplied to AI:\n${JSON.stringify(entry.sourceFacts, null, 2)}`);
    console.log(`\nSHORT DESCRIPTION:\n${entry.aiShortDescription}`);
    console.log(`\nFULL DESCRIPTION:\n${entry.aiFullDescription}`);
    console.log(`\nSEO TITLE:\n${entry.aiSeoTitle}`);
    console.log(`\nSEO DESCRIPTION:\n${entry.aiSeoDescription}`);
    console.log(`\nAI slug suggestion: ${entry.aiSlugSuggestion}`);
    console.log(`FINAL PROPOSED SLUG: ${entry.finalValidatedSlug}`);
    console.log(`Generation status: ${entry.generationStatus} (retries: ${entry.retries}, model: ${entry.model})`);
    if (entry.tokenUsage) {
      console.log(`Token usage: ${JSON.stringify(entry.tokenUsage)}`);
    }
    console.log(
      `QUALITY FLAGS: ${entry.qualityFlags.length ? entry.qualityFlags.map((f) => `${f.code}: ${f.message}`).join(" | ") : "(none)"}`,
    );
    console.log("\n" + "=".repeat(80) + "\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
