"use client";

import type { DeliveryAddress } from "@/lib/checkout";
import { georgianCities } from "@/lib/checkout";
import { FormField, formInputClass } from "@/components/ui/FormField";

/** Georgian delivery-address form — city, street address, then optional building/apartment/entrance/floor/notes. */
export function DeliveryAddressSection({
  delivery,
  errors,
  onChange,
  onBlur,
}: {
  delivery: DeliveryAddress;
  errors: Partial<Record<keyof DeliveryAddress, string>>;
  onChange: (field: keyof DeliveryAddress, value: string) => void;
  onBlur: (field: keyof DeliveryAddress) => void;
}) {
  return (
    <section aria-labelledby="delivery-address-heading" className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-border bg-surface p-5 sm:p-6">
      <h2 id="delivery-address-heading" className="text-h3 text-text">
        მიწოდების მისამართი
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="city" label="ქალაქი" required error={errors.city}>
          <select
            id="city"
            value={delivery.city}
            onChange={(e) => onChange("city", e.target.value)}
            onBlur={() => onBlur("city")}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "city-error" : undefined}
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

        <FormField id="address" label="მისამართი" required error={errors.address}>
          <input
            id="address"
            type="text"
            autoComplete="street-address"
            placeholder="ქუჩა, ნომერი"
            value={delivery.address}
            onChange={(e) => onChange("address", e.target.value)}
            onBlur={() => onBlur("address")}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? "address-error" : undefined}
            className={formInputClass(Boolean(errors.address))}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FormField id="building" label="კორპუსი" optional>
          <input
            id="building"
            type="text"
            value={delivery.building}
            onChange={(e) => onChange("building", e.target.value)}
            className={formInputClass(false)}
          />
        </FormField>

        <FormField id="apartment" label="ბინა" optional>
          <input
            id="apartment"
            type="text"
            value={delivery.apartment}
            onChange={(e) => onChange("apartment", e.target.value)}
            className={formInputClass(false)}
          />
        </FormField>

        <FormField id="entrance" label="სადარბაზო" optional>
          <input
            id="entrance"
            type="text"
            value={delivery.entrance}
            onChange={(e) => onChange("entrance", e.target.value)}
            className={formInputClass(false)}
          />
        </FormField>

        <FormField id="floor" label="სართული" optional>
          <input
            id="floor"
            type="text"
            value={delivery.floor}
            onChange={(e) => onChange("floor", e.target.value)}
            className={formInputClass(false)}
          />
        </FormField>
      </div>

      <FormField id="notes" label="დამატებითი ინფორმაცია" optional>
        <textarea
          id="notes"
          rows={2}
          placeholder="მაგ: სამაგისტრო კოდი, კურიერისთვის ორიენტირი და სხვ."
          value={delivery.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          className={formInputClass(false, "h-auto resize-none py-2.5")}
        />
      </FormField>
    </section>
  );
}
