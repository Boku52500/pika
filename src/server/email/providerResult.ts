export type SendEmailResult =
  | { ok: true; messageId: string; to: string }
  | { ok: false; reason: "not_configured" | "provider" | "invalid"; message: string };

export function notConfiguredResult(): SendEmailResult {
  return { ok: false, reason: "not_configured", message: "email_not_configured" };
}

export function interpretResendResponse(
  result: { data?: { id?: string } | null; error?: { message?: string } | null },
  to: string,
): SendEmailResult {
  if (result.error || !result.data?.id) {
    return { ok: false, reason: "provider", message: result.error?.message || "provider_rejected" };
  }
  return { ok: true, messageId: result.data.id, to };
}
