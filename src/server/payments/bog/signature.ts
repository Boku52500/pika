import { createVerify } from "node:crypto";

export function normalizeBogSignature(header: string): Buffer | null {
  const value = header.trim();
  if (!value) return null;
  const compact = value.replace(/\s+/g, "");
  try {
    const fromB64 = Buffer.from(compact, "base64");
    if (fromB64.length > 0 && fromB64.toString("base64").replace(/=+$/, "") === compact.replace(/=+$/, "")) {
      return fromB64;
    }
  } catch {
    // fall through
  }
  if (/^[0-9a-fA-F]+$/.test(compact) && compact.length % 2 === 0) {
    return Buffer.from(compact, "hex");
  }
  try {
    return Buffer.from(compact, "base64");
  } catch {
    return null;
  }
}

/**
 * Verify SHA256withRSA over the raw callback body (before JSON parse).
 * Field order in the original bytes must be preserved.
 */
export function verifyBogCallbackSignature(rawBody: Buffer, signatureHeader: string, publicKeyPem: string): boolean {
  const signature = normalizeBogSignature(signatureHeader);
  if (!signature) return false;
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(rawBody);
    verifier.end();
    return verifier.verify(publicKeyPem, signature);
  } catch {
    return false;
  }
}
