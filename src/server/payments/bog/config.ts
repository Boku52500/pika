import "server-only";

const DEFAULT_OAUTH_URL = "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";
const DEFAULT_API_BASE = "https://api.bog.ge";

export type BogConfig = {
  clientId: string;
  clientSecret: string;
  oauthUrl: string;
  apiBaseUrl: string;
};

export function bogPaymentsEnabledFlag(): boolean {
  const raw = process.env.BOG_PAYMENTS_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") return false;
  if (raw === "true" || raw === "1" || raw === "on") return true;
  return Boolean(process.env.BOG_CLIENT_ID?.trim() && process.env.BOG_CLIENT_SECRET?.trim());
}

export function getBogConfig(): BogConfig | null {
  if (!bogPaymentsEnabledFlag()) return null;
  const clientId = process.env.BOG_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.BOG_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    oauthUrl: process.env.BOG_OAUTH_URL?.trim() || DEFAULT_OAUTH_URL,
    apiBaseUrl: (process.env.BOG_API_BASE_URL?.trim() || DEFAULT_API_BASE).replace(/\/+$/, ""),
  };
}

export function bogConfigured(): boolean {
  return getBogConfig() !== null;
}

export const BOG_NOT_CONFIGURED_MESSAGE =
  "ბარათით გადახდა ამჟამად მიუწვდომელია. აირჩიეთ სხვა მეთოდი ან სცადეთ მოგვიანებით.";
