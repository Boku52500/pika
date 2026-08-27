import "server-only";

import { Resend } from "resend";
import { logError, logInfo, logWarn } from "@/server/log";
import { getEmailConfig } from "@/server/email/config";
import { recipientDomain } from "@/server/email/events";
import { interpretResendResponse, notConfiguredResult, type SendEmailResult } from "@/server/email/providerResult";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type { SendEmailResult };

type ResendSend = (payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) => Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>;

let cachedSend: ResendSend | null = null;

function defaultSend(apiKey: string): ResendSend {
  const client = new Resend(apiKey);
  return async (payload) => {
    const result = await client.emails.send(payload);
    return { data: result.data, error: result.error };
  };
}

export async function sendTransactionalEmail(
  input: SendEmailInput,
  deps?: { send?: ResendSend },
): Promise<SendEmailResult> {
  const config = getEmailConfig();
  if (!config) {
    logWarn("email.not_configured", { recipientDomain: recipientDomain(input.to) });
    return notConfiguredResult();
  }

  const to = config.overrideTo || input.to;
  if (!to.includes("@")) {
    return { ok: false, reason: "invalid", message: "invalid_recipient" };
  }

  const send = deps?.send ?? (cachedSend ??= defaultSend(config.apiKey));

  try {
    const result = await send({
      from: config.from,
      to: [to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: config.replyTo,
    });
    if (result.error || !result.data?.id) {
      const failed = interpretResendResponse(result, to);
      logError("email.send_failed", {
        reason: "provider",
        recipientDomain: recipientDomain(to),
        message: result.error?.message,
      });
      return failed;
    }
    logInfo("email.sent", {
      recipientDomain: recipientDomain(to),
      messageId: result.data.id,
    });
    return interpretResendResponse(result, to);
  } catch (error) {
    logError("email.send_failed", { error, recipientDomain: recipientDomain(to) });
    return { ok: false, reason: "provider", message: "provider_unavailable" };
  }
}
