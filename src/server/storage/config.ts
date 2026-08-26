import "server-only";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  endpoint: string;
};

function trim(value: string | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Returns R2 settings when every required variable is present.
 * Missing config must not crash the rest of the app.
 */
export function getR2Config(): R2Config | null {
  const accountId = trim(process.env.R2_ACCOUNT_ID);
  const accessKeyId = trim(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = trim(process.env.R2_SECRET_ACCESS_KEY);
  const bucket = trim(process.env.R2_BUCKET_NAME);
  const publicBaseUrl = trim(process.env.R2_PUBLIC_URL).replace(/\/+$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function isStorageConfigured(): boolean {
  return getR2Config() != null;
}

export const STORAGE_NOT_CONFIGURED =
  "სურათების ატვირთვა არ არის კონფიგურირებული. დაამატეთ Cloudflare R2 ცვლადები .env-ში (იხ. docs/storage.md).";
