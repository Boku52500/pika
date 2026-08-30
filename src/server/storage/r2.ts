import "server-only";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getR2Config, type R2Config } from "@/server/storage/config";
import { isManagedMerchImageKey } from "@/server/storage/keys";

function createClient(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export async function putProductImageObject(objectKey: string, body: Buffer): Promise<void> {
  const config = getR2Config();
  if (!config) throw new Error("R2_NOT_CONFIGURED");
  if (!isManagedMerchImageKey(objectKey)) throw new Error("INVALID_OBJECT_KEY");

  const client = createClient(config);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: body,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } finally {
    client.destroy();
  }
}

export async function deleteProductImageObject(objectKey: string): Promise<void> {
  const config = getR2Config();
  if (!config) return;
  if (!isManagedMerchImageKey(objectKey)) return;

  const client = createClient(config);
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );
  } finally {
    client.destroy();
  }
}
