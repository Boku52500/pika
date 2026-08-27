-- Admin-only BOG refunds: refund attempt rows + denormalized provider refund total.

ALTER TABLE "Payment" ADD COLUMN "providerRefundAmount" DECIMAL(12,2);

CREATE TYPE "PaymentRefundStatus" AS ENUM (
  'requested',
  'processing',
  'completed',
  'failed'
);

CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'bog',
    "providerActionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentRefundStatus" NOT NULL DEFAULT 'requested',
    "providerStatus" TEXT,
    "providerMessage" TEXT,
    "adminNote" TEXT,
    "lastError" TEXT,
    "requestedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentRefund_idempotencyKey_key" ON "PaymentRefund"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentRefund_provider_providerActionId_key" ON "PaymentRefund"("provider", "providerActionId");
CREATE INDEX "PaymentRefund_paymentId_createdAt_idx" ON "PaymentRefund"("paymentId", "createdAt");
CREATE INDEX "PaymentRefund_status_idx" ON "PaymentRefund"("status");
CREATE INDEX "PaymentRefund_requestedByAdminId_idx" ON "PaymentRefund"("requestedByAdminId");

ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_requestedByAdminId_fkey" FOREIGN KEY ("requestedByAdminId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
