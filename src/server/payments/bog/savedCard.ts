import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { recordProviderAction } from "@/server/payments/audit";
import { createBogAutomaticSavedCardPayment, deleteBogSavedCard, enrollBogSavedCard } from "@/server/payments/bog/client";
import { getBogMerchantCapabilities } from "@/server/payments/bog/capabilities";
import { savedMethodOwnedBy, savedCardConsentFromType, automaticChargeWorkflowAllowed } from "@/server/payments/bog/policy";
import { BogApiError, PaymentUserError } from "@/server/payments/bog/errors";

const OWNERSHIP_ERROR = "გადახდის მეთოდი ვერ მოიძებნა";
const WORKFLOW_DISABLED = "ავტომატური ჩამოჭრა ამჟამად გამორთულია.";

export async function requestBogSavedCardEnrollment(input: {
  providerOrderId: string;
  paymentId: string;
  orderId: string;
  customerId: string;
  consent: "recurrent" | "subscription";
}) {
  const caps = getBogMerchantCapabilities();
  if (input.consent === "recurrent" && !caps.savedCardRecurrent) {
    throw new PaymentUserError("ბარათის შენახვა ამჟამად მიუწვდომელია.");
  }
  if (input.consent === "subscription" && !caps.savedCardAutomatic) {
    throw new PaymentUserError("ავტომატური გადახდისთვის ბარათის შენახვა ამჟამად მიუწვდომელია.");
  }
  const idempotencyKey = randomUUID();
  await recordProviderAction({
    type: input.consent === "subscription" ? "save_card_subscription" : "save_card_recurrent",
    status: "requested",
    paymentId: input.paymentId,
    orderId: input.orderId,
    customerId: input.customerId,
    idempotencyKey,
  });
  await enrollBogSavedCard({
    providerOrderId: input.providerOrderId,
    consent: input.consent,
    idempotencyKey,
  });
}

export async function persistSavedCardFromDetails(input: {
  customerId: string | null | undefined;
  paymentId: string;
  parentOrderId: string | undefined;
  savedCardType: string | undefined;
  maskedPan: string | undefined;
  cardType: string | undefined;
  cardExpiry: string | undefined;
}) {
  if (!input.customerId || !input.parentOrderId) return;
  const consent = savedCardConsentFromType(input.savedCardType);
  if (!consent) return;
  await prisma.savedPaymentMethod.upsert({
    where: { provider_parentOrderId: { provider: "bog", parentOrderId: input.parentOrderId } },
    create: {
      customerId: input.customerId,
      provider: "bog",
      consent,
      parentOrderId: input.parentOrderId,
      maskedPan: input.maskedPan?.slice(0, 32),
      cardType: input.cardType?.slice(0, 16),
      cardExpiry: input.cardExpiry?.slice(0, 8),
      enrollmentPaymentId: input.paymentId,
    },
    update: {
      consent,
      maskedPan: input.maskedPan?.slice(0, 32),
      cardType: input.cardType?.slice(0, 16),
      cardExpiry: input.cardExpiry?.slice(0, 8),
      deletedAt: null,
    },
  });
}

export async function listCustomerSavedPaymentMethods(customerId: string) {
  return prisma.savedPaymentMethod.findMany({
    where: { customerId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      consent: true,
      maskedPan: true,
      cardType: true,
      cardExpiry: true,
      createdAt: true,
    },
  });
}

export async function deleteCustomerSavedPaymentMethod(customerId: string, savedMethodId: string) {
  const method = await prisma.savedPaymentMethod.findFirst({
    where: { id: savedMethodId, deletedAt: null },
  });
  if (!method || !savedMethodOwnedBy(method, customerId)) throw new PaymentUserError(OWNERSHIP_ERROR);
  const idempotencyKey = randomUUID();
  await recordProviderAction({
    type: "delete_saved_card",
    status: "requested",
    savedPaymentMethodId: method.id,
    customerId,
    idempotencyKey,
  });
  try {
    await deleteBogSavedCard({ parentOrderId: method.parentOrderId, idempotencyKey });
  } catch (error) {
    const category = error instanceof BogApiError ? "provider_rejected" : "provider_error";
    await recordProviderAction({
      type: "delete_saved_card",
      status: "failed",
      savedPaymentMethodId: method.id,
      customerId,
      errorCategory: category,
    });
    throw new PaymentUserError("ბარათის წაშლა ვერ მოხერხდა. სცადეთ მოგვიანებით.");
  }
  await prisma.savedPaymentMethod.update({
    where: { id: method.id },
    data: { deletedAt: new Date() },
  });
}

/** Off-session charge. Disabled unless the explicit workflow flag is on. Not a subscription product. */
export async function chargeSavedCardAutomatically(input: {
  savedMethodId: string;
  orderId: string;
  paymentId: string;
  actor: "system";
}) {
  const caps = getBogMerchantCapabilities();
  if (!automaticChargeWorkflowAllowed(caps)) {
    throw new PaymentUserError(WORKFLOW_DISABLED);
  }
  const method = await prisma.savedPaymentMethod.findFirst({
    where: { id: input.savedMethodId, deletedAt: null, consent: "subscription" },
  });
  if (!method) throw new PaymentUserError(OWNERSHIP_ERROR);
  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment || payment.orderId !== input.orderId) throw new PaymentUserError("გადახდა ვერ მოიძებნა");
  const idempotencyKey = payment.idempotencyKey;
  await recordProviderAction({
    type: "automatic_charge",
    status: "requested",
    paymentId: payment.id,
    orderId: input.orderId,
    savedPaymentMethodId: method.id,
    customerId: method.customerId,
    idempotencyKey,
  });
  const created = await createBogAutomaticSavedCardPayment({
    parentOrderId: method.parentOrderId,
    idempotencyKey,
    externalOrderId: (await prisma.order.findUniqueOrThrow({ where: { id: input.orderId }, select: { orderNumber: true } }))
      .orderNumber,
  });
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerOrderId: created.id,
      parentProviderOrderId: method.parentOrderId,
      savedPaymentMethodId: method.id,
      method: "saved_card",
    },
  });
  const { getBogPaymentDetails } = await import("@/server/payments/bog/client");
  const { reconcileBogPaymentDetails } = await import("@/server/payments/reconcile");
  const details = await getBogPaymentDetails(created.id);
  await reconcileBogPaymentDetails(details);
  return created.id;
}
