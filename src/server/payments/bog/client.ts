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
  bogRefundResponseSchema,
  bogZodIssues,
  canonicalizeBogPaymentDetails,
  BOG_REFUND_ACCEPTED_KEY,
  type BogCreateOrderResponse,
  type BogPaymentDetails,
  type BogRefundResponse,
} from "@/server/payments/bog/schemas";
import { buildBogRefundRequest } from "@/server/payments/bog/refundRequest";
import type { Prisma } from "@/generated/prisma/client";
import { moneyToNumber } from "@/server/money";
import {
  bogApplePayAcceptUrl,
  bogAutomaticSavedCardPaymentUrl,
  bogDeleteSavedCardUrl,
  bogEcommerceOrdersUrl,
  bogPaymentDetailsUrl,
  bogPreauthApproveUrl,
  bogPreauthRejectUrl,
  bogSavedCardEnrollUrl,
  bogSavedCardPaymentUrl,
} from "@/server/payments/bog/endpoints";

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
    url: bogEcommerceOrdersUrl(config.apiBaseUrl),
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
    url: bogPaymentDetailsUrl(config.apiBaseUrl, providerOrderId),
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

export async function refundBogPayment(input: {
  providerOrderId: string;
  idempotencyKey: string;
  amount?: Prisma.Decimal | string | number | null;
}): Promise<BogRefundResponse> {
  const config = requireConfig();
  const token = await getBogAccessToken(config);
  const request = buildBogRefundRequest({
    apiBaseUrl: config.apiBaseUrl,
    providerOrderId: input.providerOrderId,
    idempotencyKey: input.idempotencyKey,
    amount: input.amount,
  });
  const raw = await bogFetchJson({
    method: "POST",
    url: request.url,
    headers: {
      ...request.headers,
      Authorization: `Bearer ${token}`,
    },
    body: request.body,
    event: "bog.refund_request_failed",
  });

  const parsed = bogRefundResponseSchema.safeParse(raw);
  if (!parsed.success) {
    logError("bog.refund_request_failed", {
      reason: "invalid_refund_response",
      providerOrderId: input.providerOrderId,
      validationIssues: bogZodIssues(parsed.error),
    });
    throw new BogApiError("BOG refund response was invalid", 200);
  }

  const key = parsed.data.key.toLowerCase();
  if (key !== BOG_REFUND_ACCEPTED_KEY) {
    logError("bog.refund_request_failed", {
      reason: "unexpected_refund_key",
      providerOrderId: input.providerOrderId,
      providerKey: key,
    });
    throw new BogApiError("BOG refund request was not accepted", 200, key);
  }

  return {
    key,
    message: parsed.data.message,
    action_id: parsed.data.action_id,
  };
}

async function bearerHeaders(idempotencyKey?: string, extra?: Record<string, string>) {
  const config = requireConfig();
  const token = await getBogAccessToken(config);
  return {
    config,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...extra,
    },
  };
}

function parseAcceptedAction(raw: unknown, event: string, providerOrderId: string): BogRefundResponse {
  const parsed = bogRefundResponseSchema.safeParse(raw);
  if (!parsed.success) {
    logError(event, { reason: "invalid_action_response", providerOrderId, validationIssues: bogZodIssues(parsed.error) });
    throw new BogApiError("BOG action response was invalid", 200);
  }
  const key = parsed.data.key.toLowerCase();
  if (key !== BOG_REFUND_ACCEPTED_KEY) {
    logError(event, { reason: "unexpected_action_key", providerOrderId, providerKey: key });
    throw new BogApiError("BOG action request was not accepted", 200, key);
  }
  return { key, message: parsed.data.message, action_id: parsed.data.action_id };
}

export async function createBogSavedCardPayment(input: {
  parentOrderId: string;
  body: BogCreateOrderBody;
  idempotencyKey: string;
}): Promise<BogCreateOrderResponse> {
  const { config, headers } = await bearerHeaders(input.idempotencyKey, {
    "Content-Type": "application/json",
    "Accept-Language": "ka",
  });
  const raw = await bogFetchJson({
    method: "POST",
    url: bogSavedCardPaymentUrl(config.apiBaseUrl, input.parentOrderId),
    headers,
    body: JSON.stringify(input.body),
    event: "bog.saved_card_pay_failed",
  });
  const parsed = bogCreateOrderResponseSchema.safeParse(raw);
  if (!parsed.success) {
    logError("bog.saved_card_pay_failed", { reason: "invalid_create_response" });
    throw new BogApiError("BOG saved-card order response was invalid", 200);
  }
  return parsed.data;
}

export async function createBogAutomaticSavedCardPayment(input: {
  parentOrderId: string;
  idempotencyKey: string;
  callbackUrl?: string;
  externalOrderId?: string;
}): Promise<BogCreateOrderResponse> {
  const { config, headers } = await bearerHeaders(input.idempotencyKey, { "Content-Type": "application/json" });
  const body: Record<string, string> = {};
  if (input.callbackUrl) body.callback_url = input.callbackUrl;
  if (input.externalOrderId) body.external_order_id = input.externalOrderId;
  const raw = await bogFetchJson({
    method: "POST",
    url: bogAutomaticSavedCardPaymentUrl(config.apiBaseUrl, input.parentOrderId),
    headers,
    body: JSON.stringify(body),
    event: "bog.automatic_charge_failed",
  });
  const parsed = bogCreateOrderResponseSchema.safeParse(raw);
  if (!parsed.success) {
    logError("bog.automatic_charge_failed", { reason: "invalid_create_response" });
    throw new BogApiError("BOG automatic saved-card response was invalid", 200);
  }
  return parsed.data;
}

export async function enrollBogSavedCard(input: {
  providerOrderId: string;
  consent: "recurrent" | "subscription";
  idempotencyKey: string;
}): Promise<void> {
  const { config, headers } = await bearerHeaders(input.idempotencyKey);
  await bogFetchJson({
    method: "PUT",
    url: bogSavedCardEnrollUrl(config.apiBaseUrl, input.providerOrderId, input.consent),
    headers,
    event: "bog.saved_card_enroll_failed",
    acceptEmpty: true,
  });
}

export async function deleteBogSavedCard(input: {
  parentOrderId: string;
  idempotencyKey: string;
}): Promise<void> {
  const { config, headers } = await bearerHeaders(input.idempotencyKey);
  await bogFetchJson({
    method: "DELETE",
    url: bogDeleteSavedCardUrl(config.apiBaseUrl, input.parentOrderId),
    headers,
    event: "bog.saved_card_delete_failed",
    acceptEmpty: true,
  });
}

export async function approveBogPreauthorization(input: {
  providerOrderId: string;
  idempotencyKey: string;
  amount?: Prisma.Decimal | string | number | null;
  description?: string;
  split?: { split_payments: Array<{ iban: string; amount?: number; percent?: number; description?: string }> };
}): Promise<BogRefundResponse> {
  const { config, headers } = await bearerHeaders(input.idempotencyKey, { "Content-Type": "application/json" });
  const body: Record<string, unknown> = {};
  if (input.amount != null && input.amount !== "") {
    body.amount = moneyToNumber(input.amount);
  }
  if (input.description?.trim()) body.description = input.description.trim();
  if (input.split) body.split = input.split;
  const raw = await bogFetchJson({
    method: "POST",
    url: bogPreauthApproveUrl(config.apiBaseUrl, input.providerOrderId),
    headers,
    body: JSON.stringify(body),
    event: "bog.preauth_approve_failed",
  });
  return parseAcceptedAction(raw, "bog.preauth_approve_failed", input.providerOrderId);
}

export async function rejectBogPreauthorization(input: {
  providerOrderId: string;
  idempotencyKey: string;
  description?: string;
}): Promise<BogRefundResponse> {
  const { config, headers } = await bearerHeaders(input.idempotencyKey, { "Content-Type": "application/json" });
  const body: Record<string, unknown> = {};
  if (input.description?.trim()) body.description = input.description.trim();
  const raw = await bogFetchJson({
    method: "POST",
    url: bogPreauthRejectUrl(config.apiBaseUrl, input.providerOrderId),
    headers,
    body: JSON.stringify(body),
    event: "bog.preauth_reject_failed",
  });
  return parseAcceptedAction(raw, "bog.preauth_reject_failed", input.providerOrderId);
}

export async function acceptBogApplePayPayment(input: {
  providerOrderId: string;
  idempotencyKey: string;
  applePayToken: string;
}): Promise<BogCreateOrderResponse> {
  const { config, headers } = await bearerHeaders(input.idempotencyKey, { "Content-Type": "application/json" });
  const raw = await bogFetchJson({
    method: "POST",
    url: bogApplePayAcceptUrl(config.apiBaseUrl, input.providerOrderId),
    headers,
    body: JSON.stringify({ apple_pay_token: input.applePayToken }),
    event: "bog.apple_pay_accept_failed",
  });
  const parsed = bogCreateOrderResponseSchema.safeParse(raw);
  if (!parsed.success) {
    logError("bog.apple_pay_accept_failed", { reason: "invalid_accept_response" });
    throw new BogApiError("BOG Apple Pay accept response was invalid", 200);
  }
  return parsed.data;
}
