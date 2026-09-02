/**
 * Finish deterministic cleanup steps (slugs + audit) without AI calls.
 * Use after commercial-closing AI pass is interrupted (e.g. quota).
 *
 *   npx tsx --tsconfig tsconfig.json scripts/product-ai-seo-cleanup-finish.ts
 */
import fs from "node:fs/promises";
import path from "node:path";

import { auditAiManifest, printAuditReport, readinessAssessment } from "../src/lib/productImport/aiManifestAudit";
import { CONTENT_PROMPT_VERSION } from "../src/lib/productImport/aiCopywriterPrompt";
import { buildAiContentCacheKey, writeAiContentCache } from "../src/lib/productImport/aiContentCache";
import { recomputeQualityFlags } from "../src/lib/productImport/aiProductContent";
import { writeAiSeoManifestFiles, type AiSeoManifest } from "../src/lib/productImport/aiSeoManifest";
import {
  normalizeAiSlugSuggestion,
  resolveCompactProductSlugWithAiSuggestion,
} from "../src/lib/productImport/compactSlug";
import { parseProductFacts } from "../src/lib/productImport/parseProductFacts";

const GENERIC = [
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

function supplierJunk(slug: string) {
  return /\b(?:90ig|mu20|ct\d|va\d|b7jm|nggf)\b/i.test(slug) || /\b[a-z]{2}\d{5,}[a-z0-9]*\b/i.test(slug);
}
function dupTokens(slug: string) {
  const p = slug.split("-").filter(Boolean);
  return new Set(p).size !== p.length;
}
function categorize(slug: string) {
  const categories = new Set<string>();
  const reasons: string[] = [];
  for (const s of GENERIC) {
    if (slug.endsWith(`-${s}`)) {
      categories.add("B");
      reasons.push(`generic-suffix:${s}`);
    }
  }
  if (supplierJunk(slug)) {
    categories.add("C");
    reasons.push("supplier-code");
  }
  if (dupTokens(slug)) {
    categories.add("D");
    reasons.push("duplicated-token");
  }
  if (slug.length > 60) {
    categories.add("E");
    reasons.push("length>60");
  }
  return { categories: [...categories], reasons };
}
function stripGeneric(slug: string) {
  let n = slug;
  let ch = true;
  while (ch) {
    ch = false;
    for (const s of GENERIC) {
      if (n.endsWith(`-${s}`)) {
        n = n.slice(0, -(s.length + 1));
        ch = true;
      }
    }
  }
  return n.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}
function dedupe(slug: string) {
  const seen = new Set<string>();
  return slug
    .split("-")
    .filter(Boolean)
    .filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    })
    .join("-");
}
function stripSupplier(slug: string) {
  // Only strip known supplier prefixes / long opaque codes — never lone model tokens.
  return slug
    .split("-")
    .filter(Boolean)
    .filter((p) => !/^(?:90ig|mu20|b7jm|nggf)$/i.test(p))
    .filter((p) => !/^ct\d{4,}/i.test(p) && !/^va\d{4,}/i.test(p))
    .join("-");
}

async function main() {
  const partialPath = path.join(process.cwd(), "tmp", "product-seo-ai-cleanup-partial.json");
  const reviewPath = path.join(process.cwd(), "tmp", "product-seo-ai-review.json");

  let manifest: AiSeoManifest;
  let report: Record<string, unknown> = {};
  try {
    const partial = JSON.parse(await fs.readFile(partialPath, "utf8")) as {
      report: Record<string, unknown>;
      manifest: AiSeoManifest;
    };
    manifest = partial.manifest;
    report = partial.report ?? {};
    console.log("Loaded partial cleanup state");
  } catch {
    manifest = JSON.parse(await fs.readFile(reviewPath, "utf8")) as AiSeoManifest;
    console.log("Loaded review.json (no partial)");
  }

  const reserved = new Set(manifest.entries.map((e) => e.finalValidatedSlug));
  const slugCats: Record<string, Array<{ sku: string; slug: string; reasons: string[] }>> = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
  };
  const rewritten: Array<{ sku: string; from: string; to: string; categories: string[] }> = [];

  for (const entry of manifest.entries) {
    const { categories, reasons } = categorize(entry.finalValidatedSlug);
    for (const c of categories) {
      slugCats[c]!.push({ sku: entry.sku, slug: entry.finalValidatedSlug, reasons });
    }
  }

  const fix = new Set<string>();
  for (const c of ["B", "C", "D", "E"]) {
    for (const item of slugCats[c]!) fix.add(item.sku);
  }

  for (const entry of manifest.entries) {
    if (!fix.has(entry.sku)) continue;
    const from = entry.finalValidatedSlug;
    reserved.delete(from);
    let candidate = from;
    const c = categorize(from).categories;
    if (c.includes("B")) candidate = stripGeneric(candidate);
    if (c.includes("D")) candidate = dedupe(candidate);
    if (c.includes("C")) candidate = stripSupplier(candidate);
    // Re-strip generics after dedupe (e.g. ...-blender-grey → ...-grey then still may need another pass)
    candidate = stripGeneric(dedupe(candidate));
    // Never accept a collapsed brand-only slug
    if (candidate.split("-").filter(Boolean).length < 2 || candidate.length < 8) {
      candidate = stripGeneric(dedupe(from));
      if (candidate.split("-").filter(Boolean).length < 2) candidate = from;
    }
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
      rewritten.push({ sku: entry.sku, from, to: resolved, categories: c });
      const cacheKey = buildAiContentCacheKey({
        sku: entry.sku,
        name: entry.productName,
        brand: entry.brand,
        category: entry.category,
      });
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
        finalSlug: resolved,
        qualityFlags: entry.qualityFlags,
        generationStatus: "success",
      });
      console.log(`slug ${entry.sku}: ${from} → ${resolved}`);
    } else {
      reserved.add(from);
    }
  }

  report.slugsCategorized = slugCats;
  report.slugsRewritten = rewritten;

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

  await fs.writeFile(
    path.join(process.cwd(), "tmp", "product-seo-ai-audit.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cleanup: {
          ...report,
          note: "Deterministic finish applied. Resume AI closing rewrites after credits restored via npm run products:ai-seo-cleanup",
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
  await fs.writeFile(
    path.join(process.cwd(), "tmp", "product-seo-ai-cleanup-report.json"),
    JSON.stringify({ report, readiness: decision }, null, 2),
    "utf8",
  );

  printAuditReport(audit);
  console.log(`\nSlugs rewritten: ${rewritten.length}`);
  console.log(`Slug cats B/C/D/E: ${slugCats.B.length}/${slugCats.C.length}/${slugCats.D.length}/${slugCats.E.length}`);
  console.log(`Decision: ${decision}`);
  console.log(paths);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
