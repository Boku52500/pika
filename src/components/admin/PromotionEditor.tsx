"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { adminCardClass, adminInputErrorClass, adminSelectClass, adminTextareaClass } from "@/components/admin/adminUi";
import { DISCOUNT_TYPE_LABEL } from "@/lib/adminLabels";
import { saveAdminPromotion } from "@/server/actions/admin";
import type { AdminPromotionEditorData } from "@/server/admin/promotions";

export function PromotionEditor({ promotion, isNew }: { promotion: AdminPromotionEditorData; isNew?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(promotion);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function submit() {
    setMessage(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveAdminPromotion({
        id: form.id || undefined,
        code: form.code,
        type: form.type,
        value: form.value,
        minOrderAmount: form.minOrderAmount,
        usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        isActive: form.isActive,
        name: form.name,
        description: form.description,
      });
      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSuccess("აქცია შენახულია");
      if (isNew) {
        router.push(`/admin/promotions/${result.data.id}?saved=1`);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {message ? <p role="alert" className="rounded-[var(--radius-sm)] bg-danger-50 px-3 py-2 text-small text-danger-600">{message}</p> : null}
      {success ? <p role="status" className="rounded-[var(--radius-sm)] bg-success-50 px-3 py-2 text-small text-success-600">{success}</p> : null}
      <section className={adminCardClass}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="promo-code" label="კოდი" required error={fieldErrors.code}>
            <input id="promo-code" value={form.code} onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))} className={adminInputErrorClass(Boolean(fieldErrors.code))} />
          </FormField>
          <FormField id="promo-name" label="სახელი" required error={fieldErrors.name}>
            <input id="promo-name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className={adminInputErrorClass(Boolean(fieldErrors.name))} />
          </FormField>
          <FormField id="promo-type" label="ტიპი">
            <select id="promo-type" value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as "percentage" | "fixed" }))} className={adminSelectClass}>
              {Object.entries(DISCOUNT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="promo-value" label={form.type === "percentage" ? "პროცენტი" : "თანხა ₾"} required error={fieldErrors.value}>
            <input id="promo-value" inputMode="decimal" value={form.value} onChange={(e) => setForm((c) => ({ ...c, value: e.target.value }))} className={adminInputErrorClass(Boolean(fieldErrors.value))} />
          </FormField>
          <FormField id="promo-min" label="მინ. შეკვეთა" optional>
            <input id="promo-min" inputMode="decimal" value={form.minOrderAmount} onChange={(e) => setForm((c) => ({ ...c, minOrderAmount: e.target.value }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="promo-limit" label="გამოყენების ლიმიტი" optional>
            <input id="promo-limit" type="number" min={1} value={form.usageLimit} onChange={(e) => setForm((c) => ({ ...c, usageLimit: e.target.value }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="promo-start" label="დაწყება" optional>
            <input id="promo-start" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="promo-end" label="დასრულება" optional error={fieldErrors.endsAt}>
            <input id="promo-end" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((c) => ({ ...c, endsAt: e.target.value }))} className={adminInputErrorClass(Boolean(fieldErrors.endsAt))} />
          </FormField>
          <FormField id="promo-desc" label="აღწერა" optional className="sm:col-span-2">
            <textarea id="promo-desc" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className={adminTextareaClass} />
          </FormField>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-2 text-small">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
          აქტიური
        </label>
      </section>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "ინახება..." : "შენახვა"}
        </Button>
        <Button href="/admin/promotions" variant="secondary">
          სიაზე დაბრუნება
        </Button>
      </div>
    </div>
  );
}
