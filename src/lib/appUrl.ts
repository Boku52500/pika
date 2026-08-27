/**
 * Canonical public origin. Prefer APP_ORIGIN, then AUTH_URL.
 * Never hardcode a production hostname in application code.
 */
export function getAppOrigin(): URL {
  const raw = (process.env.APP_ORIGIN ?? process.env.AUTH_URL ?? "").trim().replace(/\/+$/, "");
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // Invalid values fall back to local development.
    }
  }
  return new URL("http://localhost:3000");
}

export function getAppOriginString(): string {
  return getAppOrigin().origin;
}

export function passwordResetUrl(rawToken: string): string {
  return `${getAppOriginString()}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

export function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isHttpsOrigin(url: URL = getAppOrigin()): boolean {
  return url.protocol === "https:";
}

/** Hostnames that should 308 to APP_ORIGIN (www ↔ apex). Preview hosts are left alone. */
export function shouldRedirectToCanonical(requestHost: string, canonical: URL): boolean {
  const host = requestHost.split(":")[0]?.toLowerCase() ?? "";
  const target = canonical.hostname.toLowerCase();
  if (!host || !target || isLocalHostname(target) || isLocalHostname(host)) return false;
  if (host === target) return false;

  const apex = target.replace(/^www\./, "");
  const www = target.startsWith("www.") ? target : `www.${target}`;
  return host === apex || host === www;
}

export function parsePublicHostname(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
    return url.hostname || null;
  } catch {
    return null;
  }
}
