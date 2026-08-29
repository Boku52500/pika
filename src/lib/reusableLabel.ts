/** Collapse whitespace and trim. Display labels keep the first clean casing. */
export function normalizeReusableLabel(raw: string): string {
  return raw.normalize("NFKC").trim().replace(/\s+/g, " ");
}

/**
 * Case-insensitive identity used to reuse colors / specification names / values.
 * "Black", " black ", and "BLACK" all resolve to the same key.
 */
export function reusableIdentityKey(raw: string): string {
  return normalizeReusableLabel(raw).toLocaleLowerCase("ka");
}

/**
 * Stable slug for reusable catalogue options. Keeps Georgian letters so
 * native labels stay unique, while Latin names collapse by case/whitespace.
 */
export function reusableSlug(raw: string): string {
  const slug = normalizeReusableLabel(raw)
    .toLocaleLowerCase("ka")
    .replace(/['"`]+/g, "")
    .replace(/[^a-z0-9\u10a0-\u10ff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug;
}

export function reusableSlugOrFallback(raw: string, prefix: string): string {
  return reusableSlug(raw) || `${prefix}-${hashKey(reusableIdentityKey(raw))}`;
}

function hashKey(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
