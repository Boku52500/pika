"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyCartState } from "@/components/cart/EmptyCartState";
import { useCart } from "@/hooks/useCart";
import { usePromoCode } from "@/hooks/usePromoCode";
import { useCheckoutForm } from "@/hooks/useCheckoutForm";
import { useAuth } from "@/hooks/useAuth";
import { useAddresses } from "@/hooks/useAddresses";
import { bogCalculatorBnplFlag, deliveryMethods, getDeliveryMethodFee } from "@/lib/checkout";
import { getCartTotal } from "@/lib/cart";
import { createOrder } from "@/server/actions/orders";
import { getCheckoutIdempotencyKey, rotateCheckoutIdempotencyKey } from "@/lib/checkoutIdempotency";
import { toDeliveryAddress } from "@/lib/addressFormat";
import { CustomerInfoSection } from "./CustomerInfoSection";
import { DeliveryAddressSection } from "./DeliveryAddressSection";
import { SavedAddressPicker } from "./SavedAddressPicker";
import { DeliveryMethodSection } from "./DeliveryMethodSection";
import { PaymentMethodSection } from "./PaymentMethodSection";
import { CheckoutOrderSummary } from "./CheckoutOrderSummary";
import { CheckoutStickyMobileBar } from "./CheckoutStickyMobileBar";
import { requestGooglePayToken } from "./googlePay";
import { completeApplePaySheet } from "./applePay";
import { loadBogCalculatorSdk, openBogInstallmentCalculator } from "./bogCalculator";
import { bogCalculatorUserMessage, isBogCalculatorCancelled } from "@/lib/bogSdk";
import { acceptApplePayPayment } from "@/server/payments/actions";
import type { PublicCheckoutCapabilities, SavedCheckoutCard } from "@/lib/checkout";

/**
 * Orchestrates `/checkout`: live cart + promo, form state, and a server
 * order-creation action. Cash/installment orders clear the browser cart after
 * PostgreSQL confirms the order. Card checkout redirects to Bank of Georgia
 * and clears the cart only after payment is confirmed.
 */
export function CheckoutPageClient({
  capabilities = null,
  savedMethods = [],
}: {
  capabilities?: PublicCheckoutCapabilities | null;
  savedMethods?: SavedCheckoutCard[];
}) {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const { code: promoCode, result: promoResult, removeCode: removePromoCode } = usePromoCode(subtotal);
  const form = useCheckoutForm();
  const prefill = form.prefill;
  const { customer, isLoggedIn } = useAuth();
  const { addresses, defaultAddress } = useAddresses();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveCardConsent, setSaveCardConsent] = useState<"recurrent" | null>(null);
  const [savedPaymentMethodId, setSavedPaymentMethodId] = useState<string | null>(savedMethods[0]?.id ?? null);
  const [loanMonth, setLoanMonth] = useState<number | null>(null);
  const [loanDiscountCode, setLoanDiscountCode] = useState<string | null>(null);
  const [sdkStatus, setSdkStatus] = useState<"loading" | "ready" | "error" | null>(null);
  const prefilledRef = useRef(false);
  const calculatorStatus: "idle" | "loading" | "ready" | "error" = capabilities?.bogClientId
    ? (sdkStatus ?? "loading")
    : "idle";

  useEffect(() => {
    const clientId = capabilities?.bogClientId;
    if (!clientId) return;
    let cancelled = false;
    void loadBogCalculatorSdk(clientId)
      .then(() => {
        if (!cancelled) setSdkStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setSdkStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [capabilities?.bogClientId]);

  // Prefill from the logged-in customer's profile/default address exactly
  // once — never overwrites a field the person has already started typing,
  // and guest checkout (isLoggedIn === false) is completely unaffected.
  useEffect(() => {
    if (prefilledRef.current || !isLoggedIn || !customer) return;
    prefilledRef.current = true;
    prefill({
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
      },
      delivery: defaultAddress ? toDeliveryAddress(defaultAddress) : undefined,
    });
  }, [isLoggedIn, customer, defaultAddress, prefill]);

  const discount = promoResult?.valid ? Math.min(promoResult.discount, subtotal) : 0;
  const payableSubtotal = Math.max(0, subtotal - discount);
  const selectedDeliveryMethod = deliveryMethods.find((m) => m.id === form.state.deliveryMethod) ?? null;
  const deliveryFee = selectedDeliveryMethod ? getDeliveryMethodFee(selectedDeliveryMethod, payableSubtotal) : 0;
  const total = getCartTotal(subtotal, discount, deliveryFee);

  // Guards against a one-frame "empty cart" flash between `clear()` and the
  // router.push completing, since both happen inside the same click handler.
  if (items.length === 0 && !orderPlaced) {
    return (
      <Container className="py-6 sm:py-8">
        <Breadcrumbs items={[{ label: "შეკვეთის გაფორმება" }]} className="mb-6" />
        <EmptyCartState />
      </Container>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    form.touchAll();
    if (!form.isValid || !form.state.deliveryMethod || !form.state.paymentMethod) {
      const firstErrorField = Object.keys(form.errors)[0];
      const target = firstErrorField ? document.getElementById(firstErrorField) : null;
      if (target) {
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const orderPayload = (extras: {
      googlePayToken?: string | null;
      loanMonth?: number | null;
      loanDiscountCode?: string | null;
    }) => ({
      checkoutIdempotencyKey: getCheckoutIdempotencyKey(),
      customer: form.state.customer,
      address: {
        city: form.state.delivery.city,
        street: form.state.delivery.address,
        building: form.state.delivery.building || undefined,
        apartment: form.state.delivery.apartment || undefined,
        entrance: form.state.delivery.entrance || undefined,
        floor: form.state.delivery.floor || undefined,
        additionalInfo: form.state.delivery.notes || undefined,
      },
      deliveryMethod: form.state.deliveryMethod!,
      paymentMethod: form.state.paymentMethod!,
      installmentMonths: form.state.installmentMonths,
      promoCode: promoResult?.valid ? promoCode : null,
      saveCardConsent: form.state.paymentMethod === "card" ? saveCardConsent : null,
      savedPaymentMethodId: form.state.paymentMethod === "saved_card" ? savedPaymentMethodId : null,
      googlePayToken: extras.googlePayToken ?? null,
      applePayExternal: form.state.paymentMethod === "apple_pay",
      loanMonth: extras.loanMonth ?? null,
      loanDiscountCode: extras.loanDiscountCode ?? null,
      items: items.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        selectedVariants: Object.entries(line.variants).map(([attributeSlug, optionSlug]) => ({
          attributeSlug,
          optionSlug,
        })),
      })),
    });

    try {
      let googlePayToken: string | undefined;
      if (form.state.paymentMethod === "google_pay") {
        if (!capabilities?.googlePay) throw new Error("Google Pay ამჟამად მიუწვდომელია.");
        googlePayToken = await requestGooglePayToken(capabilities.googlePay, total.toFixed(2));
      }

      if (form.state.paymentMethod === "bog_loan" || form.state.paymentMethod === "bnpl") {
        if (!capabilities?.bogClientId) throw new Error("განვადების კალკულატორი მიუწვდომელია.");
        if (calculatorStatus !== "ready") setSdkStatus("loading");
        const finished = await openBogInstallmentCalculator({
          clientId: capabilities.bogClientId,
          amount: total,
          bnpl: bogCalculatorBnplFlag(form.state.paymentMethod),
          onRequest: async (selected) => {
            setLoanMonth(selected.month);
            setLoanDiscountCode(selected.discount_code);
            const result = await createOrder(
              orderPayload({ loanMonth: selected.month, loanDiscountCode: selected.discount_code }),
            );
            if (!result.ok) {
              throw new Error(result.message);
            }
            if (!result.data.providerOrderId) {
              throw new Error("განვადების შეკვეთა ვერ შეიქმნა.");
            }
            return {
              providerOrderId: result.data.providerOrderId,
              orderNumber: result.data.orderNumber,
              redirectUrl: result.data.redirectUrl,
            };
          },
        });
        if (finished.cancelled) {
          setSubmitting(false);
          return;
        }
        setSdkStatus("ready");
        rotateCheckoutIdempotencyKey();
        setOrderPlaced(true);
        setSubmitting(false);
        router.push(`/checkout/payment/success?order=${encodeURIComponent(finished.orderNumber)}`);
        return;
      }

      const result = await createOrder(orderPayload({ googlePayToken: googlePayToken ?? null }));
      setSubmitting(false);

      if (!result.ok) {
        setSubmitError(result.message);
        if (result.orderNumber) {
          rotateCheckoutIdempotencyKey();
          setOrderPlaced(true);
          router.push(`/checkout/payment/fail?order=${encodeURIComponent(result.orderNumber)}`);
        }
        return;
      }

      rotateCheckoutIdempotencyKey();

      if (result.data.applePay) {
        setSubmitting(true);
        await completeApplePaySheet({
          result: result.data.applePay.result,
          onToken: async (token) => {
            const accepted = await acceptApplePayPayment({
              providerOrderId: result.data.applePay?.providerOrderId,
              applePayToken: token,
            });
            if (!accepted.ok) throw new Error(accepted.message);
          },
        });
        setSubmitting(false);
        setOrderPlaced(true);
        router.push(`/checkout/payment/success?order=${encodeURIComponent(result.data.orderNumber)}`);
        return;
      }

      if (result.data.redirectUrl) {
        setOrderPlaced(true);
        window.location.assign(result.data.redirectUrl);
        return;
      }

      setOrderPlaced(true);
      if (form.state.paymentMethod === "google_pay" || form.state.paymentMethod === "saved_card") {
        router.push(`/checkout/payment/success?order=${encodeURIComponent(result.data.orderNumber)}`);
        return;
      }
      clear();
      removePromoCode();
      router.push(`/checkout/success?orderId=${encodeURIComponent(result.data.orderNumber)}`);
    } catch (error) {
      setSubmitting(false);
      if (isBogCalculatorCancelled(error)) {
        return;
      }
      const message = bogCalculatorUserMessage(error);
      if (
        error instanceof Error &&
        (error.message === "BOG calculator is unavailable" || error.message === "BOG SDK failed")
      ) {
        setSdkStatus("error");
      }
      setSubmitError(message);
    }
  }

  const loanSelected =
    form.state.paymentMethod === "bnpl" || form.state.paymentMethod === "bog_loan";
  const calculatorBusy = loanSelected && calculatorStatus === "loading";
  const submitDisabled = submitting || calculatorBusy;
  const submitLabel = submitting
    ? "მუშავდება..."
    : calculatorBusy
      ? "კალკულატორი იტვირთება..."
      : "შეკვეთის დადასტურება";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Container className="pb-28 pt-6 sm:pb-8 sm:pt-8">
        <Breadcrumbs items={[{ label: "შეკვეთის გაფორმება" }]} className="mb-4" />
        <h1 className="text-h2 mb-6 text-text sm:mb-8">შეკვეთის გაფორმება</h1>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_23rem] lg:gap-8">
          <div className="flex flex-col gap-5">
            <CustomerInfoSection
              customer={form.state.customer}
              errors={{
                firstName: form.getError("firstName"),
                lastName: form.getError("lastName"),
                phone: form.getError("phone"),
                email: form.getError("email"),
              }}
              onChange={form.setCustomerField}
              onBlur={form.touchField}
            />

            {isLoggedIn ? (
              <SavedAddressPicker
                addresses={addresses}
                onSelect={(address) => form.setDeliveryAll(toDeliveryAddress(address))}
              />
            ) : null}

            <DeliveryAddressSection
              delivery={form.state.delivery}
              errors={{ city: form.getError("city"), address: form.getError("address") }}
              onChange={form.setDeliveryField}
              onBlur={form.touchField}
            />

            <DeliveryMethodSection
              value={form.state.deliveryMethod}
              onChange={form.setDeliveryMethod}
              payableSubtotal={payableSubtotal}
              error={form.getError("deliveryMethod")}
            />

            <PaymentMethodSection
              value={form.state.paymentMethod}
              onChange={form.setPaymentMethod}
              error={form.getError("paymentMethod")}
              capabilities={capabilities}
              savedMethods={savedMethods}
              isLoggedIn={isLoggedIn}
              saveCardConsent={saveCardConsent}
              onSaveCardConsent={setSaveCardConsent}
              savedPaymentMethodId={savedPaymentMethodId}
              onSavedPaymentMethodId={setSavedPaymentMethodId}
              loanSummary={loanMonth && loanDiscountCode ? `${loanMonth} თვე` : null}
              calculatorStatus={calculatorStatus}
            />
          </div>

          <CheckoutOrderSummary
            items={items}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            submitting={submitting}
            submitDisabled={submitDisabled}
            submitLabel={submitLabel}
            error={submitError}
            paymentMethod={form.state.paymentMethod}
            className="lg:sticky lg:top-24"
          />
        </div>
      </Container>

      <CheckoutStickyMobileBar
        total={total}
        submitting={submitting}
        submitDisabled={submitDisabled}
        submitLabel={submitLabel}
      />
    </form>
  );
}
