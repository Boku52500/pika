/** Shared product-image upload limits. Safe to import from client and server. */

export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_LABEL = "10 MB";
export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/avif";
export const PRODUCT_IMAGE_ACCEPT_LABEL = "JPEG, PNG, WebP, AVIF";
export const PRODUCT_IMAGE_LONG_EDGE = 1800;
export const PRODUCT_IMAGE_WEBP_QUALITY = 82;

export type ProductImageKind = "jpeg" | "png" | "webp" | "avif";

/** Inspect magic bytes. Do not trust filename or browser MIME alone. */
export function sniffImageKind(bytes: Uint8Array): ProductImageKind | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "avif" || brand === "avis") return "avif";
  }
  return null;
}

export function isPublicImageUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("/");
}
