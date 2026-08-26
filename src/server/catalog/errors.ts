import { toDeveloperDatabaseError } from "@/server/env";
import { logError } from "@/server/log";

/**
 * Thrown when a catalogue query cannot talk to PostgreSQL.
 * Pages must not fall back to mock data — fail clearly instead.
 */
export class CatalogueUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(toDeveloperDatabaseError(cause));
    this.name = "CatalogueUnavailableError";
  }
}

export async function withCatalogQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof CatalogueUnavailableError) throw error;
    logError("catalog.query_failed", { error });
    throw new CatalogueUnavailableError(error);
  }
}
