-- Transactional email delivery log (Resend). Additive; existing orders/payments unchanged.

CREATE TYPE "EmailEventType" AS ENUM (
  'password_reset',
  'order_confirmation',
  'payment_paid',
  'refund_partial',
  'refund_full',
  'order_status'
);

CREATE TYPE "EmailDeliveryStatus" AS ENUM (
  'pending',
  'sent',
  'failed'
);

CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "type" "EmailEventType" NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'pending',
    "recipient" TEXT NOT NULL,
    "recipientDomain" TEXT,
    "subject" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,
    "refundId" TEXT,
    "customerId" TEXT,
    "providerMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDelivery_eventKey_key" ON "EmailDelivery"("eventKey");
CREATE INDEX "EmailDelivery_orderId_createdAt_idx" ON "EmailDelivery"("orderId", "createdAt");
CREATE INDEX "EmailDelivery_status_idx" ON "EmailDelivery"("status");
CREATE INDEX "EmailDelivery_type_idx" ON "EmailDelivery"("type");
CREATE INDEX "EmailDelivery_customerId_idx" ON "EmailDelivery"("customerId");

ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "PaymentRefund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
