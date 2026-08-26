import "server-only";

import { prisma } from "@/server/prisma";
import { logError } from "@/server/log";

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();

function memoryStoreEnabled(): boolean {
  const store = process.env.RATE_LIMIT_STORE?.trim().toLowerCase();
  if (store === "memory") return true;
  if (store === "postgres") return false;
  return process.env.NODE_ENV !== "production";
}

function consumeMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = memoryBuckets.get(key);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

async function consumePostgres(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  try {
    const row = await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: {},
    });
    if (row.resetAt <= now) {
      await prisma.rateLimitBucket.update({ where: { key }, data: { count: 1, resetAt } });
      return true;
    }
    if (row.count >= limit) return false;
    await prisma.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
    return true;
  } catch (error) {
    logError("rate_limit.store_failed", { keyPrefix: key.split(":")[0], error });
    return false;
  }
}

/**
 * Shared limiter. Memory is the development default (single Node process).
 * Production defaults to PostgreSQL so multiple instances share a budget.
 * Set RATE_LIMIT_STORE=memory|postgres to override.
 */
export async function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (memoryStoreEnabled()) return consumeMemory(key, limit, windowMs);
  return consumePostgres(key, limit, windowMs);
}

export function clientIpFromHeaders(headers: Headers | null | undefined): string {
  const forwarded = headers?.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = headers?.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);
  return "unknown";
}
