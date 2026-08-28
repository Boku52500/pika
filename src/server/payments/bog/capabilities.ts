import "server-only";

import { bogConfigured, bogPaymentsEnabledFlag } from "@/server/payments/bog/config";
import { hostedPaymentMethods as hostedFromPolicy } from "@/server/payments/bog/policy";

function envEnabled(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "on";
}

/** Documented Google Pay gateway merchant id from BOG webpage Google Pay docs. */
export const BOG_GOOGLE_PAY_GATEWAY = "georgiancard";
export const BOG_GOOGLE_PAY_GATEWAY_MERCHANT_ID_DEFAULT = "BCR2DN4TXKPITITV";

export type BogMerchantCapabilities = {
  configured: boolean;
  standardCard: boolean;
  hostedGooglePay: boolean;
  hostedApplePay: boolean;
  externalGooglePay: boolean;
  externalApplePay: boolean;
  installment: boolean;
  bnpl: boolean;
  savedCardRecurrent: boolean;
  savedCardAutomatic: boolean;
  automaticChargeWorkflow: boolean;
  preauthorization: boolean;
  split: boolean;
  hostedP2p: boolean;
  hostedLoyalty: boolean;
  hostedGiftCard: boolean;
  googlePayGateway: string;
  googlePayGatewayMerchantId: string;
  googlePayEnvironment: "TEST" | "PRODUCTION";
  bogClientId: string | null;
};

export function getBogMerchantCapabilities(): BogMerchantCapabilities {
  const configured = bogConfigured();
  const card = configured && bogPaymentsEnabledFlag();
  return {
    configured,
    standardCard: card,
    hostedGooglePay: card && envEnabled("BOG_HOSTED_GOOGLE_PAY_ENABLED"),
    hostedApplePay: card && envEnabled("BOG_HOSTED_APPLE_PAY_ENABLED"),
    externalGooglePay: card && envEnabled("BOG_EXTERNAL_GOOGLE_PAY_ENABLED"),
    externalApplePay: card && envEnabled("BOG_EXTERNAL_APPLE_PAY_ENABLED"),
    installment: card && envEnabled("BOG_INSTALLMENT_ENABLED"),
    bnpl: card && envEnabled("BOG_BNPL_ENABLED"),
    savedCardRecurrent: card && envEnabled("BOG_SAVED_CARD_RECURRENT_ENABLED"),
    savedCardAutomatic: card && envEnabled("BOG_SAVED_CARD_AUTOMATIC_ENABLED"),
    automaticChargeWorkflow: card && envEnabled("BOG_AUTOMATIC_CHARGE_WORKFLOW_ENABLED"),
    preauthorization: card && envEnabled("BOG_PREAUTHORIZATION_ENABLED"),
    split: card && envEnabled("BOG_SPLIT_ENABLED"),
    hostedP2p: card && envEnabled("BOG_P2P_ENABLED"),
    hostedLoyalty: card && envEnabled("BOG_LOYALTY_ENABLED"),
    hostedGiftCard: card && envEnabled("BOG_GIFT_CARD_ENABLED"),
    googlePayGateway: BOG_GOOGLE_PAY_GATEWAY,
    googlePayGatewayMerchantId:
      process.env.BOG_GOOGLE_PAY_GATEWAY_MERCHANT_ID?.trim() || BOG_GOOGLE_PAY_GATEWAY_MERCHANT_ID_DEFAULT,
    googlePayEnvironment:
      process.env.GOOGLE_PAY_ENVIRONMENT?.trim().toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "TEST",
    bogClientId: process.env.BOG_CLIENT_ID?.trim() || null,
  };
}

export type CheckoutPaymentCapabilities = {
  card: boolean;
  hostedGooglePay: boolean;
  externalGooglePay: boolean;
  externalApplePay: boolean;
  bogLoan: boolean;
  bnpl: boolean;
  savedCard: boolean;
  saveCardRecurrent: boolean;
  googlePay: {
    environment: "TEST" | "PRODUCTION";
    gateway: string;
    gatewayMerchantId: string;
  } | null;
  bogClientId: string | null;
};

/** Public checkout flags — never includes client_secret. */
export function getCheckoutPaymentCapabilities(): CheckoutPaymentCapabilities {
  const caps = getBogMerchantCapabilities();
  return {
    card: caps.standardCard,
    hostedGooglePay: caps.hostedGooglePay,
    externalGooglePay: caps.externalGooglePay,
    externalApplePay: caps.externalApplePay,
    bogLoan: caps.installment,
    bnpl: caps.bnpl,
    savedCard: caps.savedCardRecurrent,
    saveCardRecurrent: caps.savedCardRecurrent,
    googlePay: caps.externalGooglePay
      ? {
          environment: caps.googlePayEnvironment,
          gateway: caps.googlePayGateway,
          gatewayMerchantId: caps.googlePayGatewayMerchantId,
        }
      : null,
    bogClientId: caps.installment || caps.bnpl ? caps.bogClientId : null,
  };
}

export function hostedPaymentMethods(caps = getBogMerchantCapabilities()) {
  return hostedFromPolicy(caps);
}

export function checkoutCaptureMode(caps = getBogMerchantCapabilities()): "automatic" | "manual" {
  return caps.preauthorization ? "manual" : "automatic";
}
