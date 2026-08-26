import "server-only";

import { randomUUID } from "node:crypto";

const PRODUCT_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const OBJECT_KEY = /^products\/[a-zA-Z0-9_-]{1,64}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;

export function createProductImageObjectKey(productId: string): string {
  if (!PRODUCT_ID.test(productId)) {
    throw new Error("INVALID_PRODUCT_ID");
  }
  return `products/${productId}/${randomUUID()}.webp`;
}

export function isManagedProductImageKey(objectKey: string): boolean {
  return OBJECT_KEY.test(objectKey);
}

export function publicUrlForObjectKey(publicBaseUrl: string, objectKey: string): string {
  return `${publicBaseUrl.replace(/\/+$/, "")}/${objectKey}`;
}
