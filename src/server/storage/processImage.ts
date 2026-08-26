import "server-only";

import sharp from "sharp";
import { PRODUCT_IMAGE_LONG_EDGE, PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_WEBP_QUALITY, sniffImageKind } from "@/lib/productImageLimits";

export class ProductImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductImageValidationError";
  }
}

export async function processProductImage(input: Buffer): Promise<Buffer> {
  if (input.byteLength === 0) {
    throw new ProductImageValidationError("ფაილი ცარიელია");
  }
  if (input.byteLength > PRODUCT_IMAGE_MAX_BYTES) {
    throw new ProductImageValidationError("სურათი ძალიან დიდია (მაქსიმუმ 10 MB)");
  }
  if (!sniffImageKind(input)) {
    throw new ProductImageValidationError("დასაშვებია მხოლოდ JPEG, PNG, WebP ან AVIF");
  }

  try {
    const image = sharp(input, { failOn: "error", sequentialRead: true }).rotate();
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp", "avif", "tiff"].includes(metadata.format)) {
      throw new ProductImageValidationError("ფაილი არ არის სურათი");
    }

    return await image
      .resize({
        width: PRODUCT_IMAGE_LONG_EDGE,
        height: PRODUCT_IMAGE_LONG_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: PRODUCT_IMAGE_WEBP_QUALITY, alphaQuality: 90, effort: 4 })
      .toBuffer();
  } catch (error) {
    if (error instanceof ProductImageValidationError) throw error;
    throw new ProductImageValidationError("სურათის დამუშავება ვერ მოხერხდა");
  }
}
