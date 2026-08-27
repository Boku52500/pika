import "server-only";

import { logError } from "@/server/log";
import { getBogConfig, type BogConfig } from "@/server/payments/bog/config";
import { BogApiError, BogNotConfiguredError } from "@/server/payments/bog/errors";
import { bogFetchJson } from "@/server/payments/bog/http";
import { bogTokenResponseSchema } from "@/server/payments/bog/schemas";

type CachedToken = { token: string; expiresAt: number };

const cache = new Map<string, CachedToken>();
const EXPIRY_SKEW_MS = 30_000;

function tokenExpiryMs(expiresIn: number | undefined): number {
  const now = Date.now();
  if (!expiresIn || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return now + 50_000;
  }
  if (expiresIn > 1e12) return expiresIn - EXPIRY_SKEW_MS;
  if (expiresIn > 1e9) return expiresIn * 1000 - EXPIRY_SKEW_MS;
  return now + expiresIn * 1000 - EXPIRY_SKEW_MS;
}

export async function getBogAccessToken(config: BogConfig = requiredConfig()): Promise<string> {
  const cached = cache.get(config.clientId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`, "utf8").toString("base64");
  let raw: unknown;
  try {
    raw = await bogFetchJson({
      method: "POST",
      url: config.oauthUrl,
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      event: "bog.auth_failed",
    });
  } catch (error) {
    logError("bog.auth_failed", { error });
    throw error;
  }

  const parsed = bogTokenResponseSchema.safeParse(raw);
  if (!parsed.success) {
    logError("bog.auth_failed", { reason: "invalid_token_response" });
    throw new BogApiError("BOG auth response was invalid", 200);
  }

  cache.set(config.clientId, {
    token: parsed.data.access_token,
    expiresAt: tokenExpiryMs(parsed.data.expires_in),
  });
  return parsed.data.access_token;
}

export function clearBogAccessTokenCache(): void {
  cache.clear();
}

function requiredConfig(): BogConfig {
  const config = getBogConfig();
  if (!config) throw new BogNotConfiguredError();
  return config;
}
