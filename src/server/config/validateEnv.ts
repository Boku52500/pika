/**
 * Environment presence checks. Safe to import from scripts (no `server-only`).
 * Never include secret values in messages.
 */

const PLACEHOLDER_SECRET = /replace-with|not-for-production|changeme|dev-auth-secret/i;

export function isPlaceholderAuthSecret(secret: string): boolean {
  return PLACEHOLDER_SECRET.test(secret);
}

export type EnvIssue = { key: string; message: string };

/** Presence checks only — never include secret values. */
export function collectEnvIssues(mode: "development" | "production"): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const authSecret = process.env.AUTH_SECRET?.trim() ?? "";
  const appOrigin = (process.env.APP_ORIGIN ?? process.env.AUTH_URL ?? "").trim();

  if (!databaseUrl) issues.push({ key: "DATABASE_URL", message: "missing" });
  if (!authSecret) issues.push({ key: "AUTH_SECRET", message: "missing" });
  else if (authSecret.length < 32) issues.push({ key: "AUTH_SECRET", message: "too short (use 32+ random bytes)" });

  if (mode === "production") {
    if (!appOrigin) issues.push({ key: "APP_ORIGIN", message: "missing (or set AUTH_URL)" });
    if (authSecret && isPlaceholderAuthSecret(authSecret)) {
      issues.push({ key: "AUTH_SECRET", message: "looks like the development placeholder" });
    }
    if (appOrigin) {
      try {
        const url = new URL(appOrigin);
        if (url.protocol !== "https:" && url.hostname !== "localhost") {
          issues.push({ key: "APP_ORIGIN", message: "production origin should be https" });
        }
      } catch {
        issues.push({ key: "APP_ORIGIN", message: "invalid URL" });
      }
    }

    if (bogPaymentsRequested()) {
      if (!process.env.BOG_CLIENT_ID?.trim()) issues.push({ key: "BOG_CLIENT_ID", message: "missing" });
      if (!process.env.BOG_CLIENT_SECRET?.trim()) issues.push({ key: "BOG_CLIENT_SECRET", message: "missing" });
    }

    if (!process.env.RESEND_API_KEY?.trim()) issues.push({ key: "RESEND_API_KEY", message: "missing" });
    if (!process.env.EMAIL_FROM?.trim()) issues.push({ key: "EMAIL_FROM", message: "missing" });
  } else {
    const resendKey = process.env.RESEND_API_KEY?.trim() ?? "";
    const emailFrom = process.env.EMAIL_FROM?.trim() ?? "";
    if (resendKey && !emailFrom) issues.push({ key: "EMAIL_FROM", message: "required when RESEND_API_KEY is set" });
    if (emailFrom && !resendKey) issues.push({ key: "RESEND_API_KEY", message: "required when EMAIL_FROM is set" });
  }

  return issues;
}

export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim() &&
      process.env.R2_PUBLIC_URL?.trim(),
  );
}

export function bogCredentialsPresent(): boolean {
  return Boolean(process.env.BOG_CLIENT_ID?.trim() && process.env.BOG_CLIENT_SECRET?.trim());
}

export function bogPaymentsRequested(): boolean {
  const raw = process.env.BOG_PAYMENTS_ENABLED?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "on") return true;
  return bogCredentialsPresent();
}
