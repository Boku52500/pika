/**
 * Patch residual cleanup issues without AI:
 * - restore collapsed slugs (e.g. braun-black)
 * - recompute quality flags after mixed-script allowlist fix
 * - refresh manifests + audit
 */
import fs from "node:fs/promises";
import path from "node:path";

import { auditAiManifest, printAuditReport, readinessAssessment } from "../src/lib/productImport/aiManifestAudit";
import { CONTENT_PROMPT_VERSION } from "../src/lib/productImport/aiCopywriterPrompt";
import { buildAiContentCacheKey, writeAiContentCache } from "../src/lib/productImport/aiContentCache";
import { recomputeQualityFlags } from "../src/lib/productImport/aiProductContent";
import { writeAiSeoManifestFiles, type AiSeoManifest } from "../src/lib/productImport/aiSeoManifest";

async function main() {
  const reviewPath = path.join(process.cwd(), "tmp", "product-seo-ai-review.json");
  const reportPath = path.join(process.cwd(), "tmp", "product-seo-ai-cleanup-report.json");
  const partialPath = path.join(process.cwd(), "tmp", "product-seo-ai-cleanup-partial.json");

  const manifest = JSON.parse(await fs.readFile(reviewPath, "utf8")) as AiSeoManifest;
  const cleanupReport = JSON.parse(await fs.readFile(reportPath, "utf8")) as {
    report: { slugsRewritten?: Array<{ sku: string; from: string; to: string }> };
  };

  let restored = 0;
  for (const entry of manifest.entries) {
    const parts = entry.finalValidatedSlug.split("-").filter(Boolean);
    const collapsed = parts.length < 2 || (parts.length === 2 && parts[1] === "black");
    if (!collapsed) continue;
    const prior = cleanupReport.report.slugsRewritten?.find((s) => s.sku === entry.sku && s.to === entry.finalValidatedSlug);
    const restoreTo = prior?.from?.replace(/-blender$/, "") ?? entry.aiSlugSuggestionNormalized;
    if (!restoreTo || restoreTo === entry.finalValidatedSlug) continue;
    // Prefer stripping only trailing -blender from original
    let next = prior?.from ?? restoreTo;
    if (next.endsWith("-blender")) next = next.slice(0, -"-blender".length);
    console.log(`restore slug ${entry.sku}: ${entry.finalValidatedSlug} → ${next}`);
    entry.finalValidatedSlug = next;
    restored += 1;
    await writeAiContentCache({
      cacheKey: buildAiContentCacheKey({
        sku: entry.sku,
        name: entry.productName,
        brand: entry.brand,
        category: entry.category,
      }),
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
      finalSlug: next,
      qualityFlags: entry.qualityFlags,
      generationStatus: "success",
    });
  }

  const peers = manifest.entries.map((e) => ({
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
    const peer = peers.find((p) => p.sku === entry.sku)!;
    entry.qualityFlags = recomputeQualityFlags(peer, peers).filter((f) => f.sku === entry.sku);
  }

  manifest.generatedAt = new Date().toISOString();
  const paths = await writeAiSeoManifestFiles(manifest);
  const retried = manifest.entries.filter((e) => e.retries > 0).map((e) => e.sku);
  const audit = auditAiManifest(manifest.entries, retried);
  const decision = readinessAssessment(manifest.entries, audit, manifest.failedSkus ?? []);

  let report: Record<string, unknown> = {};
  try {
    const partial = JSON.parse(await fs.readFile(partialPath, "utf8")) as { report: Record<string, unknown> };
    report = partial.report;
  } catch {
    report = cleanupReport.report ?? {};
  }

  await fs.writeFile(
    path.join(process.cwd(), "tmp", "product-seo-ai-audit.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cleanup: {
          ...report,
          collapsedSlugsRestored: restored,
          note: "Awaiting API credits to finish remaining ~78 commercial closing rewrites. Re-run: npm run products:ai-seo-cleanup",
        },
        audit,
        readiness: decision,
      },
      null,
      2,
    ),
    "utf8",
  );
  await fs.writeFile(partialPath, JSON.stringify({ report, manifest }, null, 2), "utf8");
  await fs.writeFile(reportPath, JSON.stringify({ report, readiness: decision }, null, 2), "utf8");

  printAuditReport(audit);
  console.log(`\nCollapsed slugs restored: ${restored}`);
  console.log(`Unresolved blocking: ${audit.factualSafety.unresolvedBlockingFlags.length}`);
  console.log(`Mixed-script affected: ${audit.mixedScript.affectedSkus.length}`);
  console.log(`Decision: ${decision}`);
  console.log(paths);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
