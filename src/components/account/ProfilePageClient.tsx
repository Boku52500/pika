"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, formInputClass } from "@/components/ui/FormField";
import { useAuth } from "@/hooks/useAuth";
import { validateProfile, validatePasswordChange } from "@/lib/authValidation";
import { formatGeorgianPhoneInput } from "@/lib/checkoutValidation";
import { cn } from "@/lib/utils";

export function ProfilePageClient() {
  const { customer, updateProfile, changePassword } = useAuth();

  const [profile, setProfile] = useState({
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
  });
  const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({});
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const profileErrors = validateProfile(profile);
  const getProfileError = (field: keyof typeof profile) =>
    profileTouched[field] || profileSubmitted ? profileErrors[field] : undefined;

  const passwordErrors = validatePasswordChange(passwords);
  const getPasswordError = (field: keyof typeof passwords) =>
    passwordTouched[field] || passwordSubmitted ? passwordErrors[field] : undefined;

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSubmitted(true);
    setProfileMessage(null);
    if (Object.keys(profileErrors).length > 0) return;

    const result = await updateProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
    });
    if (!result.ok) {
      setProfileMessage({ type: "error", text: result.message });
      return;
    }
    setProfileMessage({ type: "ok", text: "პროფილი განახლდა" });
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordSubmitted(true);
    setPasswordMessage(null);
    if (Object.keys(passwordErrors).length > 0) return;

    const result = await changePassword(passwords.currentPassword, passwords.newPassword, passwords.confirmNewPassword);
    if (!result.ok) {
      setPasswordMessage({ type: "error", text: result.message });
      return;
    }
    setPasswords({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    setPasswordSubmitted(false);
    setPasswordTouched({});
    setPasswordMessage({ type: "ok", text: "პაროლი განახლდა" });
  };

  if (!customer) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-text">პროფილი</h1>
        <p className="text-body mt-1 text-text-muted">განაახლეთ საკონტაქტო ინფორმაცია.</p>
      </div>

      <form
        onSubmit={handleProfileSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-5 sm:p-6"
      >
        <h2 className="text-h3 text-text">საკონტაქტო ინფორმაცია</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="firstName" label="სახელი" required error={getProfileError("firstName")}>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              value={profile.firstName}
              onChange={(e) => setProfile((v) => ({ ...v, firstName: e.target.value }))}
              onBlur={() => setProfileTouched((t) => ({ ...t, firstName: true }))}
              aria-invalid={Boolean(getProfileError("firstName"))}
              aria-describedby={getProfileError("firstName") ? "firstName-error" : undefined}
              className={formInputClass(Boolean(getProfileError("firstName")))}
            />
          </FormField>

          <FormField id="lastName" label="გვარი" required error={getProfileError("lastName")}>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={profile.lastName}
              onChange={(e) => setProfile((v) => ({ ...v, lastName: e.target.value }))}
              onBlur={() => setProfileTouched((t) => ({ ...t, lastName: true }))}
              aria-invalid={Boolean(getProfileError("lastName"))}
              aria-describedby={getProfileError("lastName") ? "lastName-error" : undefined}
              className={formInputClass(Boolean(getProfileError("lastName")))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="phone" label="ტელეფონის ნომერი" required error={getProfileError("phone")}>
            <div
              className={cn(
                "flex items-stretch overflow-hidden rounded-[var(--radius-sm)] border bg-surface focus-within:ring-4",
                getProfileError("phone")
                  ? "border-danger-300 focus-within:border-danger-500 focus-within:ring-danger-100"
                  : "border-border-strong focus-within:border-brand-500 focus-within:ring-brand-100"
              )}
            >
              <span className="flex shrink-0 items-center border-r border-border bg-surface-2 px-3 text-[0.9375rem] font-medium text-text-muted">
                +995
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="5XX XX XX XX"
                value={profile.phone}
                onChange={(e) => setProfile((v) => ({ ...v, phone: formatGeorgianPhoneInput(e.target.value) }))}
                onBlur={() => setProfileTouched((t) => ({ ...t, phone: true }))}
                aria-invalid={Boolean(getProfileError("phone"))}
                aria-describedby={getProfileError("phone") ? "phone-error" : undefined}
                className="h-11 w-full min-w-0 border-0 bg-transparent px-3 text-[0.9375rem] text-text placeholder:text-text-faint focus:outline-none focus:ring-0"
              />
            </div>
          </FormField>

          <FormField id="email" label="ელ. ფოსტა" required>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={profile.email}
              readOnly
              disabled
              className={formInputClass(false)}
            />
            <p className="text-label text-text-faint">ელ. ფოსტის შეცვლა დადასტურების შემდეგ იქნება ხელმისაწვდომი.</p>
          </FormField>
        </div>

        {profileMessage ? (
          <p
            role="status"
            className={cn(
              "text-small flex items-start gap-1.5",
              profileMessage.type === "ok" ? "text-success-600" : "text-danger-500"
            )}
          >
            {profileMessage.type === "ok" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
            )}
            {profileMessage.text}
          </p>
        ) : null}

        <div>
          <Button type="submit">შენახვა</Button>
        </div>
      </form>

      <form
        onSubmit={handlePasswordSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-5 sm:p-6"
      >
        <div>
          <h2 className="text-h3 text-text">პაროლის შეცვლა</h2>
          <p className="text-small mt-1 text-text-muted">შეიყვანეთ მიმდინარე პაროლი და ახალი პაროლი ორჯერ.</p>
        </div>

        <FormField id="currentPassword" label="მიმდინარე პაროლი" required error={getPasswordError("currentPassword")}>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords((v) => ({ ...v, currentPassword: e.target.value }))}
            onBlur={() => setPasswordTouched((t) => ({ ...t, currentPassword: true }))}
            aria-invalid={Boolean(getPasswordError("currentPassword"))}
            aria-describedby={getPasswordError("currentPassword") ? "currentPassword-error" : undefined}
            className={formInputClass(Boolean(getPasswordError("currentPassword")))}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="newPassword" label="ახალი პაროლი" required error={getPasswordError("newPassword")}>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((v) => ({ ...v, newPassword: e.target.value }))}
              onBlur={() => setPasswordTouched((t) => ({ ...t, newPassword: true }))}
              aria-invalid={Boolean(getPasswordError("newPassword"))}
              aria-describedby={getPasswordError("newPassword") ? "newPassword-error" : undefined}
              className={formInputClass(Boolean(getPasswordError("newPassword")))}
            />
          </FormField>

          <FormField id="confirmNewPassword" label="გაიმეორეთ ახალი პაროლი" required error={getPasswordError("confirmNewPassword")}>
            <input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={passwords.confirmNewPassword}
              onChange={(e) => setPasswords((v) => ({ ...v, confirmNewPassword: e.target.value }))}
              onBlur={() => setPasswordTouched((t) => ({ ...t, confirmNewPassword: true }))}
              aria-invalid={Boolean(getPasswordError("confirmNewPassword"))}
              aria-describedby={getPasswordError("confirmNewPassword") ? "confirmNewPassword-error" : undefined}
              className={formInputClass(Boolean(getPasswordError("confirmNewPassword")))}
            />
          </FormField>
        </div>

        {passwordMessage ? (
          <p
            role="status"
            className={cn(
              "text-small flex items-start gap-1.5",
              passwordMessage.type === "ok" ? "text-success-600" : "text-danger-500"
            )}
          >
            {passwordMessage.type === "ok" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
            )}
            {passwordMessage.text}
          </p>
        ) : null}

        <div>
          <Button type="submit" variant="secondary">
            პაროლის განახლება
          </Button>
        </div>
      </form>
    </div>
  );
}
