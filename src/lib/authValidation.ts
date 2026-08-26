import { isValidEmail, isValidGeorgianPhone } from "@/lib/checkoutValidation";
import type { FieldErrors } from "@/lib/checkoutValidation";

export const MIN_PASSWORD_LENGTH = 6;

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateLogin(data: LoginData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.email.trim()) errors.email = "შეიყვანეთ ელ. ფოსტა";
  else if (!isValidEmail(data.email)) errors.email = "შეიყვანეთ ვალიდური ელ. ფოსტის მისამართი";

  if (!data.password) errors.password = "შეიყვანეთ პაროლი";

  return errors;
}

export function validateRegister(data: RegisterData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.firstName.trim()) errors.firstName = "შეიყვანეთ სახელი";
  if (!data.lastName.trim()) errors.lastName = "შეიყვანეთ გვარი";

  if (!data.phone.trim()) errors.phone = "შეიყვანეთ ტელეფონის ნომერი";
  else if (!isValidGeorgianPhone(data.phone)) errors.phone = "შეიყვანეთ ვალიდური ნომერი, მაგ: +995 555 12 34 56";

  if (!data.email.trim()) errors.email = "შეიყვანეთ ელ. ფოსტა";
  else if (!isValidEmail(data.email)) errors.email = "შეიყვანეთ ვალიდური ელ. ფოსტის მისამართი";

  if (!data.password) errors.password = "შეიყვანეთ პაროლი";
  else if (data.password.length < MIN_PASSWORD_LENGTH) errors.password = `პაროლი უნდა შედგებოდეს მინიმუმ ${MIN_PASSWORD_LENGTH} სიმბოლოსგან`;

  if (!data.confirmPassword) errors.confirmPassword = "გაიმეორეთ პაროლი";
  else if (data.confirmPassword !== data.password) errors.confirmPassword = "პაროლები არ ემთხვევა";

  return errors;
}

/** Only same-origin relative paths — blocks `//evil.com` open redirects after mock login. */
export function safeInternalPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export function validateForgotPassword(email: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = "შეიყვანეთ ელ. ფოსტა";
  else if (!isValidEmail(email)) errors.email = "შეიყვანეთ ვალიდური ელ. ფოსტის მისამართი";
  return errors;
}

export interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export function validateProfile(data: ProfileData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.firstName.trim()) errors.firstName = "შეიყვანეთ სახელი";
  if (!data.lastName.trim()) errors.lastName = "შეიყვანეთ გვარი";

  if (!data.phone.trim()) errors.phone = "შეიყვანეთ ტელეფონის ნომერი";
  else if (!isValidGeorgianPhone(data.phone)) errors.phone = "შეიყვანეთ ვალიდური ნომერი, მაგ: +995 555 12 34 56";

  if (!data.email.trim()) errors.email = "შეიყვანეთ ელ. ფოსტა";
  else if (!isValidEmail(data.email)) errors.email = "შეიყვანეთ ვალიდური ელ. ფოსტის მისამართი";

  return errors;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export function validatePasswordChange(data: PasswordChangeData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.currentPassword) errors.currentPassword = "შეიყვანეთ მიმდინარე პაროლი";

  if (!data.newPassword) errors.newPassword = "შეიყვანეთ ახალი პაროლი";
  else if (data.newPassword.length < MIN_PASSWORD_LENGTH) errors.newPassword = `პაროლი უნდა შედგებოდეს მინიმუმ ${MIN_PASSWORD_LENGTH} სიმბოლოსგან`;

  if (!data.confirmNewPassword) errors.confirmNewPassword = "გაიმეორეთ ახალი პაროლი";
  else if (data.confirmNewPassword !== data.newPassword) errors.confirmNewPassword = "პაროლები არ ემთხვევა";

  return errors;
}
