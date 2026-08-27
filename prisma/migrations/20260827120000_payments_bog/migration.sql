-- BOG card payments: dedicated Payment attempts. Existing unpaid orders stay valid.

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'partially_refunded';

CREATE TYPE "PaymentProvider" AS ENUM ('bog');

CREATE TYPE "PaymentAttemptStatus" AS ENUM (
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded',
  'partially_refunded'
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'bog',
    "providerOrderId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GEL',
    "method" TEXT,
    "transactionId" TEXT,
    "authCode" TEXT,
    "responseCode" TEXT,
    "responseDescription" TEXT,
    "providerStatus" TEXT,
    "redirectUrl" TEXT,
    "rejectReason" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE UNIQUE INDEX "Payment_provider_providerOrderId_key" ON "Payment"("provider", "providerOrderId");
CREATE INDEX "Payment_orderId_createdAt_idx" ON "Payment"("orderId", "createdAt");
CREATE INDEX "Payment_providerOrderId_idx" ON "Payment"("providerOrderId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
