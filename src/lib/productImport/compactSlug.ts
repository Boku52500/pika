import { reusableSlug } from "@/lib/reusableLabel";
import { parseProductFacts, stripSlugNoise, type ProductFacts } from "./parseProductFacts";
import { productSlugWithSkuSuffix } from "./slug";

const MAX_COMPACT_SLUG = 72;
const COLOR_TOKENS =
  /\b(?:black|white|silver|grey|gray|gold|blue|red|green|pink|purple|starlight|midnight|space-gray|graphite|titanium|natural|lavender|ultramarine|teal|coral|orange|yellow|beige|brown)\b/gi;

const SOCKET_WATTAGE = /\b(?:AM[45]|LGA\s*\d+|sAM5|sTRX|TRX|65W|105W|125W|170W)\b/gi;
const PACKAGING = /\b(?:tray|boxed|bulk|oem|retail|w\/fan|with\s*fan)\b/gi;

/** Tokens to drop from compact slugs (supplier codes handled in stripSlugNoise). */
const SLUG_DROP_PATTERNS = [
  /\b\d{4}-\d{3}-\d{6,}\b/gi,
  /\b[A-Z]{2,}\d[A-Z0-9-]{5,}\b/gi,
  /\b[A-Z]{2,}-\d{2,}[A-Z0-9-]{2,}\b/gi,
  /\b\d{2,}[A-Z]{2,}\d[A-Z0-9-]{3,}\b/gi,
  SOCKET_WATTAGE,
  PACKAGING,
];

function slugifyPart(value: string): string {
  return reusableSlug(value);
}

function brandSlug(brand: string): string {
  return slugifyPart(brand) || "brand";
}

/** Pick meaningful slug tokens from cleaned product name. */
export function extractCompactSlugTokens(facts: ProductFacts): string[] {
  const tokens: string[] = [brandSlug(facts.brand)];

  let working = stripSlugNoise(facts.name);
  for (const pattern of SLUG_DROP_PATTERNS) {
    working = working.replace(pattern, " ");
  }
  working = working.replace(COLOR_TOKENS, " ");
  working = working.replace(new RegExp(`^${facts.brand}\\s+`, "i"), "").trim();

  const priorityChunks: string[] = [];

  if (facts.cpuModel) priorityChunks.push(facts.cpuModel);
  if (facts.gpuModel) priorityChunks.push(facts.gpuModel);
  if (facts.phoneModel) priorityChunks.push(facts.phoneModel);
  if (facts.series.length) priorityChunks.push(...facts.series);
  if (facts.primaryStorage) priorityChunks.push(facts.primaryStorage.raw);
  if (facts.resolution) priorityChunks.push(facts.resolution);
  if (facts.screenInchesRaw) priorityChunks.push(String(facts.screenInchesRaw).replace(/["''′]/g, ""));

  const modelWords = working.split(/[\s/|+()]+/).filter(Boolean);

  for (const chunk of priorityChunks) {
    const part = slugifyPart(chunk);
    if (part && !tokens.includes(part)) tokens.push(part);
  }

  for (const word of modelWords) {
    if (/^(?:and|with|the|for|edition|series|dual|band|gigabit|wireless|bluetooth|usb|hdmi|displayport|oc|rgb|argb|wifi|wi-fi)$/i.test(word)) {
      continue;
    }
    const part = slugifyPart(word);
    if (!part || part.length < 2) continue;
    if (tokens.includes(part)) continue;
    tokens.push(part);
    if (tokens.join("-").length >= MAX_COMPACT_SLUG - 10) break;
  }

  return tokens;
}

/** Build compact storefront slug from product identity tokens. */
export function buildCompactSlug(facts: ProductFacts): string {
  const tokens = extractCompactSlugTokens(facts);
  let slug = tokens.join("-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length > MAX_COMPACT_SLUG) {
    slug = slug.slice(0, MAX_COMPACT_SLUG).replace(/-+[^-]*$/, "");
  }
  return slug || slugifyPart(facts.cleanName) || productSlugWithSkuSuffix("product", facts.sku);
}

export type CompactSlugInput = {
  sku: string;
  name: string;
  brand: string;
  category: string;
};

/** Normalize AI slug suggestion — dedupe tokens, enforce length; fall back to deterministic slug. */
export function normalizeAiSlugSuggestion(suggestion: string, facts: ProductFacts): string {
  let slug = reusableSlug(suggestion.replace(/\//g, "-"));
  const parts = slug.split("-").filter(Boolean);
  const seen = new Set<string>();
  const unique = parts.filter((part) => {
    if (seen.has(part)) return false;
    seen.add(part);
    return true;
  });
  slug = unique.join("-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length > MAX_COMPACT_SLUG) {
    slug = slug.slice(0, MAX_COMPACT_SLUG).replace(/-+[^-]*$/, "");
  }
  if (!slug || slug.length < 3) return buildCompactSlug(facts);
  return slug;
}

/** Resolve slug using AI semantic suggestion, then deterministic collision handling. */
export function resolveCompactProductSlugWithAiSuggestion(
  input: CompactSlugInput,
  aiSuggestionNormalized: string | null,
  reservedSlugs: Set<string>,
): { slug: string; facts: ProductFacts; collisionSuffix: string | null } {
  const facts = parseProductFacts(input);
  const base =
    aiSuggestionNormalized && aiSuggestionNormalized.length >= 3
      ? aiSuggestionNormalized
      : buildCompactSlug(facts);

  if (!reservedSlugs.has(base)) {
    return { slug: base, facts, collisionSuffix: null };
  }

  const differentiators: string[] = [];
  if (facts.color) differentiators.push(facts.color);
  if (facts.primaryStorage) differentiators.push(facts.primaryStorage.raw);
  if (facts.screenInchesRaw) differentiators.push(String(facts.screenInches));
  if (facts.resolution) differentiators.push(facts.resolution);
  if (facts.formFactor) differentiators.push(facts.formFactor);

  for (const diff of differentiators) {
    const part = slugifyPart(diff);
    if (!part) continue;
    const candidate = `${base}-${part}`.slice(0, MAX_COMPACT_SLUG).replace(/-+$/g, "");
    if (!reservedSlugs.has(candidate)) {
      return { slug: candidate, facts, collisionSuffix: part };
    }
  }

  const withSku = productSlugWithSkuSuffix(base, input.sku).slice(0, MAX_COMPACT_SLUG);
  if (!reservedSlugs.has(withSku)) {
    return { slug: withSku, facts, collisionSuffix: input.sku };
  }

  let index = 2;
  while (index < 1000) {
    const candidate = productSlugWithSkuSuffix(`${base}-${index}`, input.sku).slice(0, MAX_COMPACT_SLUG);
    if (!reservedSlugs.has(candidate)) {
      return { slug: candidate, facts, collisionSuffix: String(index) };
    }
    index += 1;
  }

  return { slug: productSlugWithSkuSuffix(base, `${input.sku}-${Date.now()}`), facts, collisionSuffix: input.sku };
}

/** Resolve unique compact slug across batch + reserved existing slugs. */
export function resolveCompactProductSlug(
  input: CompactSlugInput,
  reservedSlugs: Set<string>,
): { slug: string; facts: ProductFacts; collisionSuffix: string | null } {
  const facts = parseProductFacts(input);
  const base = buildCompactSlug(facts);
  if (!reservedSlugs.has(base)) {
    return { slug: base, facts, collisionSuffix: null };
  }

  const differentiators: string[] = [];
  if (facts.color) differentiators.push(facts.color);
  if (facts.primaryStorage) differentiators.push(facts.primaryStorage.raw);
  if (facts.screenInchesRaw) differentiators.push(String(facts.screenInches));
  if (facts.resolution) differentiators.push(facts.resolution);
  if (facts.formFactor) differentiators.push(facts.formFactor);

  for (const diff of differentiators) {
    const part = slugifyPart(diff);
    if (!part) continue;
    const candidate = `${base}-${part}`.slice(0, MAX_COMPACT_SLUG).replace(/-+$/g, "");
    if (!reservedSlugs.has(candidate)) {
      return { slug: candidate, facts, collisionSuffix: part };
    }
  }

  const withSku = productSlugWithSkuSuffix(base, input.sku).slice(0, MAX_COMPACT_SLUG);
  if (!reservedSlugs.has(withSku)) {
    return { slug: withSku, facts, collisionSuffix: input.sku };
  }

  let index = 2;
  while (index < 1000) {
    const candidate = productSlugWithSkuSuffix(`${base}-${index}`, input.sku).slice(0, MAX_COMPACT_SLUG);
    if (!reservedSlugs.has(candidate)) {
      return { slug: candidate, facts, collisionSuffix: String(index) };
    }
    index += 1;
  }

  return { slug: productSlugWithSkuSuffix(base, `${input.sku}-${Date.now()}`), facts, collisionSuffix: input.sku };
}

/** Convenience wrapper when only name fields are available. */
export function compactSlugFromFields(input: CompactSlugInput): string {
  const facts = parseProductFacts(input);
  return buildCompactSlug(facts);
}
