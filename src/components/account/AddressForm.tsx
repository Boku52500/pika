"use client";

import { FormField, formInputClass } from "@/components/ui/FormField";
import { georgianCities } from "@/lib/checkout";
import type { DeliveryAddress } from "@/lib/checkout";

export interface AddressFormValues extends DeliveryAddress {
  label: string;
}

export const emptyAddressForm: AddressFormValues = {
  label: "",
  city: "",
  address: "",
  building: "",
  apartment: "",
  entrance: "",
  floor: "",
  notes: "",
};

export function AddressForm({
  idPrefix,
  values,
  errors,
  onChange,
  onBlur,
}: {
  idPrefix: string;
  values: AddressFormValues;
  errors: Partial<Record<"city" | "address", string>>;
  onChange: (field: keyof AddressFormValues, value: string) => void;
  onBlur: (field: "city" | "address") => void;
}) {
  const cityId = `${idPrefix}-city`;
  const addressId = `${idPrefix}-address`;

  return (
    <div className="flex flex-col gap-4">
      <FormField id={`${idPrefix}-label`} label="დასახელება" optional>
        <input
          id={`${idPrefix}-label`}
          type="text"
          placeholder="მაგ: სახლი, ოფისი"
          value={values.label}
          onChange={(e) => onChange("label", e.target.value)}
          className={formInputClass(false)}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id={cityId} label="ქალაქი" required error={errors.city}>
          <select
            id={cityId}
            value={values.city}
            onChange={(e) => onChange("city", e.target.value)}
            onBlur={() => onBlur("city")}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? `${cityId}-error` : undefined}
            className={formInputClass(Boolean(errors.city))}
          >
            <option value="" disabled>
              აირჩიეთ ქალაქი
            </option>
            {georgianCities.map((city) => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id={addressId} label="მისამართი" required error={errors.address}>
          <input
            id={addressId}
            type="text"
            autoComplete="street-address"
            placeholder="ქუჩა, ნომერი"
            value={values.address}
            onChange={(e) => onChange("address", e.target.value)}
            onBlur={() => onBlur("address")}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? `${addressId}-error` : undefined}
            className={formInputClass(Boolean(errors.address))}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FormField id={`${idPrefix}-building`} label="კორპუსი / სახლის ნომერი" optional>
          <input
            id={`${idPrefix}-building`}
            type="text"
            value={values.building}
            onChange={(e) => onChange("building", e.target.value)}
            className={formInputClass(false)}
          />
        </FormField>
        <FormField id={`${idPrefix}-apartment`} label="ბინა" optional>
          <input
            id={`${idPrefix}-apartment`}
            type="text"
            value={values.apartment}
            onChange={(e) => onChange("apartment", e.target.value)}
            className={formInputClass(false)}
          />
        </FormField>
        <FormField id={`${idPrefix}-entrance`} label="სადარბაზო" optional>
          <input
            id={`${idPrefix}-entrance`}
            type="text"
            value={values.entrance}
            onChange={(e) => onChange("entrance", e.target.value)}
            className={formInputClass(false)}
          />
        </FormField>
        <FormField id={`${idPrefix}-floor`} label="სართული" optional>
          <input
            id={`${idPrefix}-floor`}
            type="text"
            value={values.floor}
            onChange={(e) => onChange("floor", e.target.value)}
            className={formInputClass(false)}
          />
        </FormField>
      </div>

      <FormField id={`${idPrefix}-notes`} label="დამატებითი ინფორმაცია" optional>
        <textarea
          id={`${idPrefix}-notes`}
          rows={2}
          placeholder="მაგ: სამაგისტრო კოდი, კურიერისთვის ორიენტირი და სხვ."
          value={values.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          className={formInputClass(false, "h-auto resize-none py-2.5")}
        />
      </FormField>
    </div>
  );
}
