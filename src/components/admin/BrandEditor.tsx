"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { adminCardClass, adminInputErrorClass, adminTextareaClass } from "@/components/admin/adminUi";
import { deleteAdminBrand, saveAdminBrand } from "@/server/actions/admin";
import type { AdminBrandEditorData } from "@/server/admin/brands";

export function BrandEditor({ brand, isNew, productCount = 0 }: { brand: AdminBrandEditorData; isNew?: boolean; productCount?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(brand);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  function submit() {
    setMessage(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveAdminBrand({
        id: form.id || undefined,
        slug: form.slug,
        logoUrl: form.logoUrl,
        indexable: form.indexable,
        sortOrder: Number(form.sortOrder),
        translations: form.translations,
      });
      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSuccess("ბრენდი შენახულია");
      if (isNew) {
        router.push(`/admin/brands/${result.data.id}?saved=1`);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteAdminBrand({ id: form.id });
      setConfirmDelete(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.push("/admin/brands");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {message ? <p role="alert" className="rounded-[var(--radius-sm)] bg-danger-50 px-3 py-2 text-small text-danger-600">{message}</p> : null}
      {success ? <p role="status" className="rounded-[var(--radius-sm)] bg-success-50 px-3 py-2 text-small text-success-600">{success}</p> : null}
      <section className={adminCardClass}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="brand-name" label="დასახელება (ქართული)" required error={fieldErrors["translations.ka.name"]}>
            <input
              id="brand-name"
              value={form.translations.ka.name}
              onChange={(e) => setForm((c) => ({ ...c, translations: { ...c.translations, ka: { ...c.translations.ka, name: e.target.value } } }))}
              className={adminInputErrorClass(Boolean(fieldErrors["translations.ka.name"]))}
            />
          </FormField>
          <FormField id="brand-slug" label="Slug" required error={fieldErrors.slug}>
            <input id="brand-slug" value={form.slug} onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value }))} className={adminInputErrorClass(Boolean(fieldErrors.slug))} />
          </FormField>
          <FormField id="brand-logo" label="ლოგოს URL" optional className="sm:col-span-2">
            <input id="brand-logo" value={form.logoUrl} onChange={(e) => setForm((c) => ({ ...c, logoUrl: e.target.value }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="brand-sort" label="რიგი">
            <input id="brand-sort" type="number" min={0} value={form.sortOrder} onChange={(e) => setForm((c) => ({ ...c, sortOrder: Number(e.target.value) }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="brand-desc" label="აღწერა" optional className="sm:col-span-2">
            <textarea id="brand-desc" value={form.translations.ka.description} onChange={(e) => setForm((c) => ({ ...c, translations: { ...c.translations, ka: { ...c.translations.ka, description: e.target.value } } }))} className={adminTextareaClass} />
          </FormField>
          <FormField id="brand-seo-title" label="SEO სათაური" optional>
            <input id="brand-seo-title" value={form.translations.ka.seoTitle} onChange={(e) => setForm((c) => ({ ...c, translations: { ...c.translations, ka: { ...c.translations.ka, seoTitle: e.target.value } } }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="brand-seo-desc" label="SEO აღწერა" optional>
            <input id="brand-seo-desc" value={form.translations.ka.seoDescription} onChange={(e) => setForm((c) => ({ ...c, translations: { ...c.translations, ka: { ...c.translations.ka, seoDescription: e.target.value } } }))} className={adminInputErrorClass(false)} />
          </FormField>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-2 text-small">
          <input type="checkbox" checked={form.indexable} onChange={(e) => setForm((c) => ({ ...c, indexable: e.target.checked }))} />
          ინდექსირებადი
        </label>
        {!isNew ? <p className="text-label mt-2 text-text-muted">პროდუქტები ამ ბრენდზე: {productCount}</p> : null}
      </section>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "ინახება..." : "შენახვა"}
        </Button>
        {!isNew ? (
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmDelete(true)}>
            წაშლა
          </Button>
        ) : null}
        <Button href="/admin/brands" variant="ghost">
          სიაზე დაბრუნება
        </Button>
      </div>
      <AdminConfirmDialog
        open={confirmDelete}
        title="ბრენდის წაშლა"
        description={productCount > 0 ? `ამ ბრენდზე ${productCount} პროდუქტია. წაშლა დაიბლოკება, თუ ურთიერთობა არსებობს.` : "ბრენდი სამუდამოდ წაიშლება."}
        confirmLabel="წაშლა"
        danger
        pending={pending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}
