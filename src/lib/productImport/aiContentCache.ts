import fs from "node:fs/promises";
import path from "node:path";

import { CONTENT_PROMPT_VERSION } from "./aiCopywriterPrompt";
import type { AiGeneratedProductContent } from "./aiProductContent";

export type AiContentCacheEntry = {
  cacheKey: string;
  promptVersion: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  generatedAt: string;
  model: string;
  tokenUsage: AiGeneratedProductContent["tokenUsage"];
  content: AiGeneratedProductContent["content"];
  aiSlugSuggestion: string;
  finalSlug: string;
  qualityFlags: AiGeneratedProductContent["qualityFlags"];
  generationStatus: "success" | "failed";
  error?: string;
};

export function buildAiContentCacheKey(input: {
  sku: string;
  name: string;
  brand: string;
  category: string;
}): string {
  const raw = `${input.sku}|${input.name}|${input.brand}|${input.category}|${CONTENT_PROMPT_VERSION}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return `${input.sku}-${Math.abs(hash).toString(36)}`;
}

export function defaultAiCacheDir(): string {
  return path.join(process.cwd(), "tmp", "ai-product-content-cache");
}

export async function readAiContentCache(
  cacheKey: string,
  cacheDir = defaultAiCacheDir(),
): Promise<AiContentCacheEntry | null> {
  const filePath = path.join(cacheDir, `${cacheKey}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const entry = JSON.parse(raw) as AiContentCacheEntry;
    if (entry.promptVersion !== CONTENT_PROMPT_VERSION) return null;
    if (entry.generationStatus !== "success") return null;
    return entry;
  } catch {
    return null;
  }
}

export async function writeAiContentCache(
  entry: AiContentCacheEntry,
  cacheDir = defaultAiCacheDir(),
): Promise<string> {
  await fs.mkdir(cacheDir, { recursive: true });
  const filePath = path.join(cacheDir, `${entry.cacheKey}.json`);
  await fs.writeFile(filePath, JSON.stringify(entry, null, 2), "utf8");
  return filePath;
}

export type AiProgressFile = {
  updatedAt: string;
  promptVersion: string;
  completedSkus: string[];
  failedSkus: Array<{ sku: string; error: string }>;
};

export function defaultProgressPath(): string {
  return path.join(process.cwd(), "tmp", "product-seo-ai-progress.json");
}

export async function readAiProgress(progressPath = defaultProgressPath()): Promise<AiProgressFile> {
  try {
    const raw = await fs.readFile(progressPath, "utf8");
    const data = JSON.parse(raw) as AiProgressFile;
    if (data.promptVersion !== CONTENT_PROMPT_VERSION) {
      return { updatedAt: new Date().toISOString(), promptVersion: CONTENT_PROMPT_VERSION, completedSkus: [], failedSkus: [] };
    }
    return data;
  } catch {
    return { updatedAt: new Date().toISOString(), promptVersion: CONTENT_PROMPT_VERSION, completedSkus: [], failedSkus: [] };
  }
}

export async function writeAiProgress(progress: AiProgressFile, progressPath = defaultProgressPath()): Promise<void> {
  await fs.mkdir(path.dirname(progressPath), { recursive: true });
  await fs.writeFile(progressPath, JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }, null, 2), "utf8");
}

/** Pre-load reserved slugs from existing v3.1 cache entries for resume-safe collision handling. */
export async function loadCachedFinalSlugs(cacheDir = defaultAiCacheDir()): Promise<Set<string>> {
  const reserved = new Set<string>();
  try {
    const files = await fs.readdir(cacheDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(cacheDir, file), "utf8");
        const entry = JSON.parse(raw) as AiContentCacheEntry;
        if (entry.promptVersion === CONTENT_PROMPT_VERSION && entry.generationStatus === "success" && entry.finalSlug) {
          reserved.add(entry.finalSlug);
        }
      } catch {
        // skip corrupt cache files
      }
    }
  } catch {
    // cache dir may not exist yet
  }
  return reserved;
}
