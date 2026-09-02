/**
 * Canonical Category.slug generation: Georgian display names → Latin URL slugs.
 * Display names stay Georgian; this is transliteration for URLs only (not translation).
 */

const GEORGIAN_TO_LATIN: Readonly<Record<string, string>> = {
  ა: "a",
  ბ: "b",
  გ: "g",
  დ: "d",
  ე: "e",
  ვ: "v",
  ზ: "z",
  თ: "t",
  ი: "i",
  კ: "k",
  ლ: "l",
  მ: "m",
  ნ: "n",
  ო: "o",
  პ: "p",
  ჟ: "zh",
  რ: "r",
  ს: "s",
  ტ: "t",
  უ: "u",
  ფ: "f",
  ქ: "k",
  ღ: "gh",
  ყ: "y",
  შ: "sh",
  ჩ: "ch",
  ც: "ts",
  ძ: "dz",
  წ: "ts",
  ჭ: "ch",
  ხ: "kh",
  ჯ: "j",
  ჰ: "h",
};

const GEORGIAN_CHAR = /[\u10A0-\u10FF]/;
const CANONICAL_CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function containsGeorgianCharacters(value: string): boolean {
  return GEORGIAN_CHAR.test(value);
}

/** True when slug is lowercase Latin kebab-case (a-z, 0-9, single hyphens). */
export function isCanonicalCategorySlug(slug: string): boolean {
  return CANONICAL_CATEGORY_SLUG.test(slug);
}

/**
 * Transliterate a Georgian (or mixed) category label into a Latin kebab slug.
 * Does not translate meaning — letter mapping only.
 */
export function categorySlugFromName(name: string, maxLength = 80): string {
  const normalized = name.normalize("NFKC").trim().toLocaleLowerCase("ka");
  let out = "";
  for (const ch of normalized) {
    if (GEORGIAN_TO_LATIN[ch]) {
      out += GEORGIAN_TO_LATIN[ch];
      continue;
    }
    if (/[a-z0-9]/.test(ch)) {
      out += ch;
      continue;
    }
    // Word separators → hyphen
    if (/[\s_/\\|.,;:+&]+/.test(ch) || ch === "-" || ch === "–" || ch === "—" || ch === "|") {
      out += "-";
      continue;
    }
    // Drop other punctuation / symbols
  }

  const slug = out
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return slug || "category";
}

/**
 * Pick a unique category slug against an existing reserved set.
 * Collision resolution is deterministic: base, base-2, base-3, …
 */
export function ensureUniqueCategorySlug(baseSlug: string, reserved: ReadonlySet<string>): string {
  const base = isCanonicalCategorySlug(baseSlug) ? baseSlug : categorySlugFromName(baseSlug);
  if (!reserved.has(base)) return base;
  let index = 2;
  while (index < 10_000) {
    const candidate = `${base}-${index}`.slice(0, 80).replace(/-+$/g, "");
    if (!reserved.has(candidate)) return candidate;
    index += 1;
  }
  return `${base}-${Date.now()}`.slice(0, 80);
}

/** Whether an existing persisted slug should be rewritten to Latin. */
export function categorySlugNeedsLatinRewrite(slug: string): boolean {
  return containsGeorgianCharacters(slug) || !isCanonicalCategorySlug(slug);
}
