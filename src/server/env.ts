/**
 * Database URL helpers shared by the Prisma client, seed, and `db:verify`.
 * Never log the raw connection string — it contains the password.
 */

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and start PostgreSQL (`docker compose up -d`). See docs/database.md.",
    );
  }
  return url;
}

/** Host/db only — safe to print in developer errors. */
export function describeDatabaseTarget(url: string): string {
  try {
    const parsed = new URL(url);
    const port = parsed.port || "5432";
    return `${parsed.hostname}:${port}${parsed.pathname}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as { code?: unknown; errorCode?: unknown };
  if (typeof record.errorCode === "string") return record.errorCode;
  if (typeof record.code === "string") return record.code;
  return undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isDatabaseUnreachable(error: unknown): boolean {
  const code = errorCode(error);
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT" || code === "P1001") {
    return true;
  }
  return /can't reach database server|econnrefused|connect econnrefused/i.test(errorMessage(error));
}

export function formatDatabaseError(error: unknown): string {
  const target = process.env.DATABASE_URL ? describeDatabaseTarget(process.env.DATABASE_URL) : "(DATABASE_URL unset)";

  if (isDatabaseUnreachable(error)) {
    return [
      `Cannot reach PostgreSQL at ${target}.`,
      "Start the development database with `docker compose up -d`, wait until it is healthy, then retry.",
      "Install Docker Desktop if `docker` is not available. Do not switch this project to SQLite.",
      "See docs/database.md.",
    ].join(" ");
  }

  return `Database error while talking to ${target}: ${errorMessage(error)}`;
}

/** Avoid wrapping errors that already use the messages above. */
export function toDeveloperDatabaseError(error: unknown): string {
  if (error instanceof Error) {
    const { message } = error;
    if (
      message.startsWith("DATABASE_URL is not set") ||
      message.startsWith("Cannot reach PostgreSQL") ||
      message.startsWith("Database error while talking to")
    ) {
      return message;
    }
  }
  return formatDatabaseError(error);
}
