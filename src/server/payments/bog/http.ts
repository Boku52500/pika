import "server-only";

import { logError, logWarn } from "@/server/log";
import { BogApiError } from "@/server/payments/bog/errors";

const DEFAULT_TIMEOUT_MS = 20_000;

type BogHttpInit = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  event: string;
  /** HTTP 202 with an empty body is success for saved-card enroll/delete. */
  acceptEmpty?: boolean;
};

export async function bogFetchJson(init: BogHttpInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(init.url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    logError(init.event, { error, urlHost: safeHost(init.url) });
    throw new BogApiError("BOG request failed", 0);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      logWarn(init.event, { status: response.status, parse: "invalid_json" });
      throw new BogApiError("BOG returned a non-JSON response", response.status);
    }
  }

  if (!response.ok) {
    logWarn(init.event, { status: response.status, urlHost: safeHost(init.url) });
    throw new BogApiError("BOG request was rejected", response.status, errorCodeFromBody(parsed));
  }

  if (parsed == null && init.acceptEmpty) {
    return { accepted: true, httpStatus: response.status };
  }

  return parsed;
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid";
  }
}

function errorCodeFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as { error?: unknown; error_description?: unknown; code?: unknown };
  if (typeof record.code === "string") return record.code;
  if (typeof record.error === "string") return record.error;
  return undefined;
}
