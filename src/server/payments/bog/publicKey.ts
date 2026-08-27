import "server-only";

/**
 * BOG callback verification public key from
 * https://api.bog.ge/docs/en/payments/standard-process/callback
 * This is not a secret. Override with BOG_CALLBACK_PUBLIC_KEY for tests.
 */
export const BOG_CALLBACK_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`;

export function getBogCallbackPublicKeyPem(): string {
  const override = process.env.BOG_CALLBACK_PUBLIC_KEY?.trim();
  if (override) {
    return override.includes("BEGIN PUBLIC KEY")
      ? override.replace(/\\n/g, "\n")
      : `-----BEGIN PUBLIC KEY-----\n${override}\n-----END PUBLIC KEY-----`;
  }
  return BOG_CALLBACK_PUBLIC_KEY_PEM;
}
