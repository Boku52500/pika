/**
 * Env-only email config. Safe to import from tests/scripts (no `server-only`).
 * Never log or return the API key to the client.
 */

export type EmailConfig = {
  apiKey: string;
  from: string;
  replyTo?: string;
  overrideTo?: string;
};

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  if (!apiKey || !from) return null;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
  return {
    apiKey,
    from,
    replyTo,
    overrideTo: resolveOverrideTo(),
  };
}

export function emailConfigured(): boolean {
  return getEmailConfig() !== null;
}

export const EMAIL_NOT_CONFIGURED_MESSAGE = "ელ. ფოსტის გამოგზავნა ამჟამად მიუწვდომელია.";

/**
 * Local/dev redirect of every transactional email. Ignored in production unless
 * EMAIL_ALLOW_OVERRIDE=true is set explicitly.
 */
function resolveOverrideTo(): string | undefined {
  const override = process.env.EMAIL_OVERRIDE_TO?.trim();
  if (!override) return undefined;
  const allow =
    process.env.EMAIL_ALLOW_OVERRIDE?.trim().toLowerCase() === "true" ||
    process.env.EMAIL_ALLOW_OVERRIDE?.trim() === "1";
  if (process.env.NODE_ENV === "production" && !allow) return undefined;
  return override;
}
