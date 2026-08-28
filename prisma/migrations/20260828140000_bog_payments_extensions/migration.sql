-- BOG Payments extensions: preauth states, extra methods, saved cards,
-- provider-action audit, split recipients. Existing payment rows stay as-is
-- (captureMode defaults to automatic; historical paid is not reinterpreted).

ALTER TYPE "PaymentStatus" ADD VALUE 'authorized';

ALTER TYPE "PaymentAttemptStatus" ADD VALUE 'authorized';
ALTER TYPE "PaymentAttemptStatus" ADD VALUE 'voided';

ALTER TYPE "PaymentMethod" ADD VALUE 'google_pay';
ALTER TYPE "PaymentMethod" ADD VALUE 'apple_pay';
ALTER TYPE "PaymentMethod" ADD VALUE 'bog_loan';
ALTER TYPE "PaymentMethod" ADD VALUE 'bnpl';
ALTER TYPE "PaymentMethod" ADD VALUE 'saved_card';

CREATE TYPE "SavedCardConsent" AS ENUM ('recurrent', 'subscription');

CREATE TYPE "ProviderActionType" AS ENUM (
  'save_card_recurrent',
  'save_card_subscription',
  'delete_saved_card',
  'automatic_charge',
  'capture',
  'reject_authorization',
  'refund',
  'split',
  'apple_pay_accept'
);

CREATE TYPE "ProviderActionStatus" AS ENUM (
  'requested',
  'accepted',
  'completed',
  'failed'
);

ALTER TABLE "Payment"
  ADD COLUMN "captureMode" TEXT NOT NULL DEFAULT 'automatic',
  ADD COLUMN "authorizedAmount" DECIMAL(12,2),
  ADD COLUMN "capturedAmount" DECIMAL(12,2),
  ADD COLUMN "parentProviderOrderId" TEXT,
  ADD COLUMN "savedPaymentMethodId" TEXT,
  ADD COLUMN "paymentOption" TEXT,
  ADD COLUMN "savedCardType" TEXT,
  ADD COLUMN "loanMonth" INTEGER,
  ADD COLUMN "loanDiscountCode" TEXT,
  ADD COLUMN "splitStatus" TEXT,
  ADD COLUMN "splitSnapshot" JSONB,
  ADD COLUMN "providerSession" JSONB,
  ADD COLUMN "payerIdentifier" TEXT,
  ADD COLUMN "cardExpiryDate" TEXT;

CREATE TABLE "SavedPaymentMethod" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'bog',
    "consent" "SavedCardConsent" NOT NULL,
    "parentOrderId" TEXT NOT NULL,
    "maskedPan" TEXT,
    "cardType" TEXT,
    "cardExpiry" TEXT,
    "enrollmentPaymentId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedPaymentMethod_provider_parentOrderId_key" ON "SavedPaymentMethod"("provider", "parentOrderId");
CREATE INDEX "SavedPaymentMethod_customerId_deletedAt_idx" ON "SavedPaymentMethod"("customerId", "deletedAt");

CREATE TABLE "ProviderAction" (
    "id" TEXT NOT NULL,
    "type" "ProviderActionType" NOT NULL,
    "status" "ProviderActionStatus" NOT NULL DEFAULT 'requested',
    "orderId" TEXT,
    "paymentId" TEXT,
    "savedPaymentMethodId" TEXT,
    "customerId" TEXT,
    "providerActionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "normalizedStatus" TEXT,
    "errorCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProviderAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderAction_idempotencyKey_key" ON "ProviderAction"("idempotencyKey");
CREATE INDEX "ProviderAction_paymentId_createdAt_idx" ON "ProviderAction"("paymentId", "createdAt");
CREATE INDEX "ProviderAction_orderId_createdAt_idx" ON "ProviderAction"("orderId", "createdAt");
CREATE INDEX "ProviderAction_type_createdAt_idx" ON "ProviderAction"("type", "createdAt");
CREATE INDEX "ProviderAction_providerActionId_idx" ON "ProviderAction"("providerActionId");

CREATE TABLE "BogSplitRecipient" (
    "id" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "percent" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BogSplitRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BogSplitRecipient_isActive_sortOrder_idx" ON "BogSplitRecipient"("isActive", "sortOrder");

CREATE INDEX "Payment_savedPaymentMethodId_idx" ON "Payment"("savedPaymentMethodId");
CREATE INDEX "Payment_parentProviderOrderId_idx" ON "Payment"("parentProviderOrderId");

ALTER TABLE "SavedPaymentMethod" ADD CONSTRAINT "SavedPaymentMethod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedPaymentMethod" ADD CONSTRAINT "SavedPaymentMethod_enrollmentPaymentId_fkey" FOREIGN KEY ("enrollmentPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_savedPaymentMethodId_fkey" FOREIGN KEY ("savedPaymentMethodId") REFERENCES "SavedPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProviderAction" ADD CONSTRAINT "ProviderAction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderAction" ADD CONSTRAINT "ProviderAction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderAction" ADD CONSTRAINT "ProviderAction_savedPaymentMethodId_fkey" FOREIGN KEY ("savedPaymentMethodId") REFERENCES "SavedPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderAction" ADD CONSTRAINT "ProviderAction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
