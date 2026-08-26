import type { CheckoutData, CustomerInfo, DeliveryAddress } from "@/lib/checkout";

/** field name -> Georgian error message. */
export type FieldErrors = Record<string, string | undefined>;

/** Strips everything but digits, then drops a leading "995" country code if present. */
function toLocalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("995") ? digits.slice(3) : digits;
}

/** Georgian mobile numbers: 9 digits starting with 5 (e.g. 555 12 34 56), with or without a "+995"/"995" prefix already typed in. */
export function isValidGeorgianPhone(raw: string): boolean {
  return /^5\d{8}$/.test(toLocalDigits(raw));
}

/** Formats free-typed digits into "5XX XX XX XX" as the user types (used by the phone field's onChange). */
export function formatGeorgianPhoneInput(raw: string): string {
  const digits = toLocalDigits(raw).slice(0, 9);
  const parts = [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return parts.join(" ");
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function validateCustomer(customer: CustomerInfo): FieldErrors {
  const errors: FieldErrors = {};
  if (!customer.firstName.trim()) errors.firstName = "შეიყვანეთ სახელი";
  if (!customer.lastName.trim()) errors.lastName = "შეიყვანეთ გვარი";

  if (!customer.phone.trim()) errors.phone = "შეიყვანეთ ტელეფონის ნომერი";
  else if (!isValidGeorgianPhone(customer.phone)) errors.phone = "შეიყვანეთ ვალიდური ნომერი, მაგ: +995 555 12 34 56";

  if (!customer.email.trim()) errors.email = "შეიყვანეთ ელ. ფოსტა";
  else if (!isValidEmail(customer.email)) errors.email = "შეიყვანეთ ვალიდური ელ. ფოსტის მისამართი";

  return errors;
}

export function validateDelivery(delivery: DeliveryAddress): FieldErrors {
  const errors: FieldErrors = {};
  if (!delivery.city.trim()) errors.city = "აირჩიეთ ქალაქი";
  if (!delivery.address.trim()) errors.address = "შეიყვანეთ მისამართი";
  return errors;
}

/** Full-form validation used both for per-field live errors and the final submit gate. */
export function validateCheckoutForm(data: CheckoutData): FieldErrors {
  const errors: FieldErrors = {
    ...validateCustomer(data.customer),
    ...validateDelivery(data.delivery),
  };
  if (!data.deliveryMethod) errors.deliveryMethod = "აირჩიეთ მიწოდების მეთოდი";
  if (!data.paymentMethod) errors.paymentMethod = "აირჩიეთ გადახდის მეთოდი";
  return errors;
}
