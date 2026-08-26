-- Production-ready rate limiting + unused reset-token flag.
-- Does not change catalogue or customer data.

ALTER TABLE "PasswordResetToken" ADD COLUMN "usedAt" TIMESTAMP(3);

CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
