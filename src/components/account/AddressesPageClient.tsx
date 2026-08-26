"use client";

import { useState } from "react";
import { MapPin, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAddresses } from "@/hooks/useAddresses";
import { validateDelivery } from "@/lib/checkoutValidation";
import { formatAddressLines } from "@/lib/addressFormat";
import type { SavedAddress } from "@/types/account";
import { AccountEmptyState } from "./AccountEmptyState";
import { AddressForm, emptyAddressForm, type AddressFormValues } from "./AddressForm";

type Editor = { mode: "add" } | { mode: "edit"; address: SavedAddress };

export function AddressesPageClient({ initialAddresses = [] }: { initialAddresses?: SavedAddress[] }) {
  const { addresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useAddresses(initialAddresses);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [values, setValues] = useState<AddressFormValues>(emptyAddressForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = validateDelivery(values);
  const getError = (field: "city" | "address") => (touched[field] || submitted ? errors[field] : undefined);

  const openAdd = () => {
    setEditor({ mode: "add" });
    setValues(emptyAddressForm);
    setTouched({});
    setSubmitted(false);
  };

  const openEdit = (address: SavedAddress) => {
    setEditor({ mode: "edit", address });
    setValues({
      label: address.label ?? "",
      city: address.city,
      address: address.address,
      building: address.building,
      apartment: address.apartment,
      entrance: address.entrance,
      floor: address.floor,
      notes: address.notes,
    });
    setTouched({});
    setSubmitted(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      label: values.label.trim() || undefined,
      city: values.city,
      address: values.address,
      building: values.building,
      apartment: values.apartment,
      entrance: values.entrance,
      floor: values.floor,
      notes: values.notes,
    };

    const result =
      editor?.mode === "edit" ? await updateAddress(editor.address.id, payload) : await addAddress(payload);
    if (!result?.ok) {
      setFormError(result && "message" in result ? result.message : "მისამართის შენახვა ვერ მოხერხდა");
      return;
    }
    setEditor(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-h2 text-text">მისამართები</h1>
          <p className="text-body mt-1 text-text-muted">შეინახეთ მიწოდების მისამართები შემდეგი შეკვეთებისთვის.</p>
        </div>
        {!editor ? (
          <Button type="button" onClick={openAdd} className="shrink-0">
            მისამართის დამატება
          </Button>
        ) : null}
      </div>

      {editor ? (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-border bg-surface p-5 sm:p-6"
        >
          <h2 className="text-h3 text-text">{editor.mode === "edit" ? "მისამართის რედაქტირება" : "ახალი მისამართი"}</h2>
          <AddressForm
            idPrefix={editor.mode === "edit" ? "edit" : "add"}
            values={values}
            errors={{ city: getError("city"), address: getError("address") }}
            onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
            onBlur={(field) => setTouched((current) => ({ ...current, [field]: true }))}
          />
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button type="submit">{editor.mode === "edit" ? "შენახვა" : "დამატება"}</Button>
            <Button type="button" variant="secondary" onClick={() => setEditor(null)}>
              გაუქმება
            </Button>
          </div>
          {formError ? <p role="alert" className="text-small text-danger-500">{formError}</p> : null}
        </form>
      ) : null}

      {!editor && addresses.length === 0 ? (
        <AccountEmptyState
          icon={MapPin}
          title="მისამართები ჯერ არ გაქვთ"
          description="დაამატეთ მიწოდების მისამართი, რომ შემდეგი შეკვეთისას ავტომატურად შეივსოს."
          actionLabel="მისამართის დამატება"
          onAction={openAdd}
        />
      ) : null}

      {addresses.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {addresses.map((address) => {
            const lines = formatAddressLines(address);
            return (
              <li
                key={address.id}
                className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-small font-semibold text-text">{address.label || "მისამართი"}</p>
                    {address.isDefault ? (
                      <span className="text-label rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 font-medium normal-case tracking-normal text-brand-700">
                        ძირითადი
                      </span>
                    ) : null}
                  </div>
                  <p className="text-small mt-1.5 text-text-muted">{lines.join(", ")}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!address.isDefault ? (
                    <Button type="button" size="sm" variant="secondary" onClick={() => void setDefaultAddress(address.id)}>
                      <Star className="size-3.5" strokeWidth={2} />
                      ძირითადი
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(address)}>
                    <Pencil className="size-3.5" strokeWidth={2} />
                    რედაქტირება
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void removeAddress(address.id)}>
                    <Trash2 className="size-3.5" strokeWidth={2} />
                    წაშლა
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
