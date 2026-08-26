"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { CustomerInfo, DeliveryAddress, DeliveryMethodId, PaymentMethodId } from "@/lib/checkout";
import { validateCheckoutForm, type FieldErrors } from "@/lib/checkoutValidation";

export interface CheckoutFormState {
  customer: CustomerInfo;
  delivery: DeliveryAddress;
  deliveryMethod: DeliveryMethodId | null;
  paymentMethod: PaymentMethodId | null;
  installmentMonths: number | null;
  touched: Record<string, boolean>;
  /** Set once the user has attempted to submit — reveals every remaining error at once instead of only touched fields. */
  submitted: boolean;
}

type Action =
  | { type: "SET_CUSTOMER"; field: keyof CustomerInfo; value: string }
  | { type: "SET_DELIVERY"; field: keyof DeliveryAddress; value: string }
  | { type: "SET_DELIVERY_ALL"; delivery: DeliveryAddress }
  | { type: "PREFILL"; customer?: Partial<CustomerInfo>; delivery?: Partial<DeliveryAddress> }
  | { type: "SET_DELIVERY_METHOD"; value: DeliveryMethodId }
  | { type: "SET_PAYMENT_METHOD"; value: PaymentMethodId }
  | { type: "SET_INSTALLMENT_MONTHS"; value: number | null }
  | { type: "TOUCH"; field: string }
  | { type: "TOUCH_ALL" };

const initialState: CheckoutFormState = {
  customer: { firstName: "", lastName: "", phone: "", email: "" },
  delivery: { city: "", address: "", building: "", apartment: "", entrance: "", floor: "", notes: "" },
  deliveryMethod: null,
  paymentMethod: null,
  installmentMonths: null,
  touched: {},
  submitted: false,
};

const ALL_REQUIRED_FIELDS = ["firstName", "lastName", "phone", "email", "city", "address", "deliveryMethod", "paymentMethod"];

function reducer(state: CheckoutFormState, action: Action): CheckoutFormState {
  switch (action.type) {
    case "SET_CUSTOMER":
      return { ...state, customer: { ...state.customer, [action.field]: action.value } };
    case "SET_DELIVERY":
      return { ...state, delivery: { ...state.delivery, [action.field]: action.value } };
    case "SET_DELIVERY_ALL":
      return { ...state, delivery: action.delivery };
    case "PREFILL":
      return {
        ...state,
        customer: {
          firstName: state.customer.firstName || action.customer?.firstName || "",
          lastName: state.customer.lastName || action.customer?.lastName || "",
          phone: state.customer.phone || action.customer?.phone || "",
          email: state.customer.email || action.customer?.email || "",
        },
        delivery: {
          city: state.delivery.city || action.delivery?.city || "",
          address: state.delivery.address || action.delivery?.address || "",
          building: state.delivery.building || action.delivery?.building || "",
          apartment: state.delivery.apartment || action.delivery?.apartment || "",
          entrance: state.delivery.entrance || action.delivery?.entrance || "",
          floor: state.delivery.floor || action.delivery?.floor || "",
          notes: state.delivery.notes || action.delivery?.notes || "",
        },
      };
    case "SET_DELIVERY_METHOD":
      return { ...state, deliveryMethod: action.value, touched: { ...state.touched, deliveryMethod: true } };
    case "SET_PAYMENT_METHOD":
      return {
        ...state,
        paymentMethod: action.value,
        installmentMonths: action.value === "installment" ? state.installmentMonths : null,
        touched: { ...state.touched, paymentMethod: true },
      };
    case "SET_INSTALLMENT_MONTHS":
      return { ...state, installmentMonths: action.value };
    case "TOUCH":
      return { ...state, touched: { ...state.touched, [action.field]: true } };
    case "TOUCH_ALL":
      return { ...state, submitted: true, touched: Object.fromEntries(ALL_REQUIRED_FIELDS.map((f) => [f, true])) };
    default:
      return state;
  }
}

/**
 * Reducer-based checkout form state — one dispatchable action per field
 * group instead of a dozen independent `useState` calls, and a single
 * validation pass (`validateCheckoutForm`) shared by live per-field errors
 * and the final submit gate.
 */
export function useCheckoutForm() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setCustomerField = useCallback(
    (field: keyof CustomerInfo, value: string) => dispatch({ type: "SET_CUSTOMER", field, value }),
    []
  );
  const setDeliveryField = useCallback(
    (field: keyof DeliveryAddress, value: string) => dispatch({ type: "SET_DELIVERY", field, value }),
    []
  );
  const setDeliveryAll = useCallback((delivery: DeliveryAddress) => dispatch({ type: "SET_DELIVERY_ALL", delivery }), []);
  const prefill = useCallback(
    (payload: { customer?: Partial<CustomerInfo>; delivery?: Partial<DeliveryAddress> }) =>
      dispatch({ type: "PREFILL", ...payload }),
    []
  );
  const setDeliveryMethod = useCallback((value: DeliveryMethodId) => dispatch({ type: "SET_DELIVERY_METHOD", value }), []);
  const setPaymentMethod = useCallback((value: PaymentMethodId) => dispatch({ type: "SET_PAYMENT_METHOD", value }), []);
  const setInstallmentMonths = useCallback((value: number | null) => dispatch({ type: "SET_INSTALLMENT_MONTHS", value }), []);
  const touchField = useCallback((field: string) => dispatch({ type: "TOUCH", field }), []);
  const touchAll = useCallback(() => dispatch({ type: "TOUCH_ALL" }), []);

  const errors = useMemo<FieldErrors>(
    () =>
      validateCheckoutForm({
        customer: state.customer,
        delivery: state.delivery,
        deliveryMethod: state.deliveryMethod,
        paymentMethod: state.paymentMethod,
      }),
    [state.customer, state.delivery, state.deliveryMethod, state.paymentMethod]
  );

  const getError = useCallback(
    (field: string) => (state.touched[field] || state.submitted ? errors[field] : undefined),
    [state.touched, state.submitted, errors]
  );

  const isValid = Object.keys(errors).length === 0;

  return {
    state,
    errors,
    isValid,
    setCustomerField,
    setDeliveryField,
    setDeliveryAll,
    prefill,
    setDeliveryMethod,
    setPaymentMethod,
    setInstallmentMonths,
    touchField,
    touchAll,
    getError,
  };
}
