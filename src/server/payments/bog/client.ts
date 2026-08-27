import "server-only";

import { logError } from "@/server/log";
import { getBogAccessToken } from "@/server/payments/bog/auth";
import { getBogConfig } from "@/server/payments/bog/config";
import { BogApiError, BogNotConfiguredError } from "@/server/payments/bog/errors";
import { bogFetchJson } from "@/server/payments/bog/http";
import type { BogCreateOrderBody } from "@/server/payments/bog/payload";
import {
  bogCreateOrderResponseSchema,
  bogPaymentDetailsSchema,
  bogZodIssues,
  canonicalizeBogPaymentDetails,
  type BogCreateOrderResponse,
  type BogPaymentDetails,
} from "@/server/payments/bog/schemas";

function requireConfig() {
  const config = getBogConfig();
  if (!config) throw new BogNotConfiguredError();
  return config;
}

export async function createBogEcommerceOrder(input: {
  body: BogCreateOrderBody;
  idempotencyKey: string;
}): Promise<BogCreateOrderResponse> {
  const config = requireConfig();
  const token = await getBogAccessToken(config);
  const raw = await bogFetchJson({
    method: "POST",
    url: `${config.apiBaseUrl}/payments/v1/ecommerce/orders`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": "ka",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify(input.body),
    event: "bog.order_create_failed",
  });

  const parsed = bogCreateOrderResponseSchema.safeParse(raw);
  if (!parsed.success) {
    logError("bog.order_create_failed", { reason: "invalid_create_response" });
    throw new BogApiError("BOG create-order response was invalid", 200);
  }
  return parsed.data;
}

export async function getBogPaymentDetails(providerOrderId: string): Promise<BogPaymentDetails> {
  const config = requireConfig();
  const token = await getBogAccessToken(config);
  const raw = await bogFetchJson({
    method: "GET",
    url: `${config.apiBaseUrl}/payments/v1/receipt/${encodeURIComponent(providerOrderId)}`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    event: "bog.payment_details_failed",
  });

  const parsed = bogPaymentDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    logError("bog.payment_details_failed", {
      reason: "invalid_details_response",
      providerOrderId,
      validationIssues: bogZodIssues(parsed.error),
    });
    throw new BogApiError("BOG payment-details response was invalid", 200);
  }
  return canonicalizeBogPaymentDetails(parsed.data);
}
