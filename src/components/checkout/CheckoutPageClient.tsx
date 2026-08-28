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
import { deliveryMethods, getDeliveryMethodFee } from "@/lib/checkout";
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

/**
 * Orchestrates `/checkout`: live cart + promo, form state, and a server
 * order-creation action. Cash/installment orders clear the browser cart after
 * PostgreSQL confirms the order. Card checkout redirects to Bank of Georgia
 * and clears the cart only after payment is confirmed.
 */
export function CheckoutPageClient() {
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
  const prefilledRef = useRef(false);

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
    const result = await createOrder({
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
      deliveryMethod: form.state.deliveryMethod,
      paymentMethod: form.state.paymentMethod,
      installmentMonths: form.state.installmentMonths,
      promoCode: promoResult?.valid ? promoCode : null,
      items: items.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        selectedVariants: Object.entries(line.variants).map(([attributeSlug, optionSlug]) => ({
          attributeSlug,
          optionSlug,
        })),
      })),
    });
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

    if (result.data.redirectUrl) {
      setOrderPlaced(true);
      window.location.assign(result.data.redirectUrl);
      return;
    }

    setOrderPlaced(true);
    clear();
    removePromoCode();
    router.push(`/checkout/success?orderId=${encodeURIComponent(result.data.orderNumber)}`);
  }

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
              installmentMonths={form.state.installmentMonths}
              onInstallmentMonthsChange={form.setInstallmentMonths}
              total={total}
              error={form.getError("paymentMethod")}
            />
          </div>

          <CheckoutOrderSummary
            items={items}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            submitting={submitting}
            error={submitError}
            paymentMethod={form.state.paymentMethod}
            className="lg:sticky lg:top-24"
          />
        </div>
      </Container>

      <CheckoutStickyMobileBar total={total} submitting={submitting} />
    </form>
  );
}
