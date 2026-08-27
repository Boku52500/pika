import type { PaymentAttemptStatus } from "@/generated/prisma/client";
import type { StorefrontOrder } from "@/lib/orderView";

export type StorefrontPaymentAttempt = {
  id: string;
  provider: string;
  providerOrderId: string | null;
  status: PaymentAttemptStatus;
  providerStatus: string | null;
  method: string | null;
  transactionId: string | null;
  authCode: string | null;
  responseCode: string | null;
  responseDescription: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type PaymentPageData = {
  order: StorefrontOrder;
  attempts: StorefrontPaymentAttempt[];
  latestStatus: PaymentAttemptStatus | null;
  canRetry: boolean;
};
