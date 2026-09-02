/**
 * Generate AI-authored SEO manifest for ALL valid Excel products (~458).
 * Does NOT write to database.
 *
 * Usage:
 *   npm run products:ai-seo-manifest -- "C:\\path\\products.xlsx"
 *
 * Resumable via per-product cache + tmp/product-seo-ai-progress.json
 */
import fs from "node:fs/promises";
import path from "node:path";

import { auditAiManifest, printAuditReport, readinessAssessment } from "../src/lib/productImport/aiManifestAudit";
import { CONTENT_PROMPT_VERSION } from "../src/lib/productImport/aiCopywriterPrompt";
import {
  loadCachedFinalSlugs,
  readAiProgress,
  writeAiProgress,
} from "../src/lib/productImport/aiContentCache";
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
import { parseAllExcelProducts } from "../src/lib/productImport/excelProducts";
import { loadLocalEnv } from "./loadLocalEnv";

loadLocalEnv();

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv.find((a) => a && !a.startsWith("--"));
  if (!fileArg) {
    console.error('Usage: npm run products:ai-seo-manifest -- "C:\\path\\products.xlsx"');
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
  const reservedSlugs = await loadCachedFinalSlugs();
  const started = Date.now();
  const results = [];
  const retriedSkus: string[] = [];
  const progress = await readAiProgress();
  const peerEntries = [];

  let cacheHits = 0;
  let freshGenerations = 0;

  console.log("\n=== AI Product SEO Manifest (full catalogue) ===\n");
  console.log(`Model: ${config.model}`);
  console.log(`Prompt version: ${CONTENT_PROMPT_VERSION}`);
  console.log(`Source: ${path.basename(filePath)}`);
  console.log(`Products to process: ${allRows.length}`);
  console.log(`Pre-loaded reserved slugs from cache: ${reservedSlugs.size}`);
  console.log(`Previously completed (progress file): ${progress.completedSkus.length}\n`);

  for (let i = 0; i < allRows.length; i += 1) {
    const row = allRows[i]!;
    const label = `[${i + 1}/${allRows.length}] ${row.sku}`;
    process.stdout.write(`${label} — ${row.name.slice(0, 50)}… `);

    try {
      const result = await generateAiProductContent(row, {
        config,
        reservedSlugs,
        peerEntries,
        useCache: true,
      });

      if (result.generationStatus === "cached") {
        cacheHits += 1;
        reservedSlugs.add(result.finalSlug);
        console.log("cached");
      } else if (result.generationStatus === "success") {
        freshGenerations += 1;
        console.log(result.retries > 0 ? `ok (${result.retries} retries)` : "ok");
      } else {
        console.log(`FAILED: ${result.error ?? "unknown"}`);
      }

      if (result.retries > 0) retriedSkus.push(row.sku);

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
        progress.failedSkus = progress.failedSkus.filter((f) => f.sku !== row.sku);
      } else {
        progress.failedSkus = [
          ...progress.failedSkus.filter((f) => f.sku !== row.sku),
          { sku: row.sku, error: result.error ?? "failed" },
        ];
      }

      results.push(result);
      await writeAiProgress(progress);

      if ((i + 1) % 25 === 0) {
        const elapsed = ((Date.now() - started) / 1000 / 60).toFixed(1);
        console.log(`\n--- Progress checkpoint: ${i + 1}/${allRows.length} (${elapsed} min) ---\n`);
      }
    } catch (err) {
      if (err instanceof AiProviderFatalError) {
        console.error("\n\n=== AI Provider Fatal Error — stopping batch ===\n");
        console.error(`Code: ${err.code}`);
        console.error(`Message: ${err.message}`);
        console.error("\nCompleted cache/progress preserved. Re-run to resume.");
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

  const failedSkus = results.filter((r) => r.generationStatus === "failed").map((r) => r.sku);
  const totalRetries = results.reduce((sum, r) => sum + r.retries, 0);
  const productsWithRetries = results.filter((r) => r.retries > 0).length;

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
    failedSkus,
  };

  const paths = await writeAiSeoManifestFiles(manifest);
  const audit = auditAiManifest(manifestEntries, retriedSkus);
  const readiness = readinessAssessment(manifestEntries, audit, failedSkus);

  const auditPath = path.join(process.cwd(), "tmp", "product-seo-ai-audit.json");
  await fs.writeFile(auditPath, JSON.stringify({ readiness, audit, generationStats: {
    attempted: allRows.length,
    successful: manifestEntries.length - failedSkus.length,
    failed: failedSkus.length,
    totalRetries,
    productsWithRetries,
    generationTimeMs,
    cacheHits,
    freshGenerations,
    totalTokenUsage,
  } }, null, 2), "utf8");

  console.log("\n--- Manifest files ---");
  console.log(`JSON: ${paths.jsonPath}`);
  console.log(`CSV:  ${paths.csvPath}`);
  console.log(`XLSX: ${paths.xlsxPath}`);
  console.log(`Audit: ${auditPath}`);

  console.log("\n--- Generation stats ---");
  console.log(`Attempted: ${allRows.length}`);
  console.log(`Successful: ${manifestEntries.length - failedSkus.length}`);
  console.log(`Failed: ${failedSkus.length}`);
  console.log(`Cache hits: ${cacheHits}`);
  console.log(`Fresh generations: ${freshGenerations}`);
  console.log(`Total retries: ${totalRetries}`);
  console.log(`Products with retries: ${productsWithRetries}`);
  console.log(`Time: ${(generationTimeMs / 1000 / 60).toFixed(1)} min`);
  console.log(`Tokens: prompt=${totalTokenUsage.promptTokens} completion=${totalTokenUsage.completionTokens} total=${totalTokenUsage.totalTokens}`);

  printAuditReport(audit);

  console.log("\n=== FINAL READINESS ASSESSMENT ===\n");
  console.log(readiness);
  console.log("\nNo DB import performed. Awaiting explicit approval.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
