import "server-only";

const REDACT_KEYS = /password|secret|token|authorization|cookie|hash|database_url|access_key|api_key|apikey|signature|payer|pan|card_number|client_secret/i;

function sanitize(value: unknown, key = ""): unknown {
  if (REDACT_KEYS.test(key)) return "[redacted]";
  if (value == null) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      out[entryKey] = sanitize(entryValue, entryKey);
    }
    return out;
  }
  return String(value);
}

function write(level: "info" | "warn" | "error", event: string, extra?: Record<string, unknown>) {
  const payload = {
    level,
    event,
    ts: new Date().toISOString(),
    ...((sanitize(extra) as Record<string, unknown>) ?? {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function logInfo(event: string, extra?: Record<string, unknown>) {
  write("info", event, extra);
}

export function logWarn(event: string, extra?: Record<string, unknown>) {
  write("warn", event, extra);
}

export function logError(event: string, extra?: Record<string, unknown>) {
  write("error", event, extra);
}
