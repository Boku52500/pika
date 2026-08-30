"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { adminCardClass, adminInputErrorClass, adminTextareaClass } from "@/components/admin/adminUi";
import { deleteAdminBrand, saveAdminBrand, uploadAdminBrandLogo } from "@/server/actions/admin";
import type { AdminBrandEditorData } from "@/server/admin/brands";

export function BrandEditor({
  brand,
  isNew,
  productCount = 0,
  storageConfigured = false,
}: {
  brand: AdminBrandEditorData;
  isNew?: boolean;
  productCount?: number;
  storageConfigured?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(brand);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        showOnHomepage: form.showOnHomepage,
        homepageSortOrder: Number(form.homepageSortOrder),
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

  function uploadLogo() {
    const file = fileRef.current?.files?.[0];
    if (!file || !form.id) {
      setMessage("ჯერ შეინახეთ ბრენდი, შემდეგ ატვირთეთ ლოგო");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("brandId", form.id);
      formData.set("file", file);
      const result = await uploadAdminBrandLogo(formData);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setForm((current) => ({ ...current, logoUrl: result.data.url }));
      setSuccess("ლოგო ატვირთულია");
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
          {storageConfigured && form.id ? (
            <FormField id="brand-logo-file" label="ლოგოს ატვირთვა" optional className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} id="brand-logo-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={adminInputErrorClass(false)} />
                <Button type="button" variant="secondary" disabled={pending} onClick={uploadLogo}>
                  ატვირთვა
                </Button>
              </div>
            </FormField>
          ) : null}
          {form.logoUrl ? (
            <div className="sm:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.logoUrl} alt="" className="h-16 w-auto max-w-[12rem] object-contain" />
            </div>
          ) : null}
          <FormField id="brand-sort" label="კატალოგის რიგი">
            <input id="brand-sort" type="number" min={0} value={form.sortOrder} onChange={(e) => setForm((c) => ({ ...c, sortOrder: Number(e.target.value) }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="brand-home-sort" label="მთავარი გვერდის რიგი">
            <input id="brand-home-sort" type="number" min={0} value={form.homepageSortOrder} onChange={(e) => setForm((c) => ({ ...c, homepageSortOrder: Number(e.target.value) }))} className={adminInputErrorClass(false)} />
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
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input type="checkbox" checked={form.indexable} onChange={(e) => setForm((c) => ({ ...c, indexable: e.target.checked }))} />
            ინდექსირებადი
          </label>
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input type="checkbox" checked={form.showOnHomepage} onChange={(e) => setForm((c) => ({ ...c, showOnHomepage: e.target.checked }))} />
            გამოჩნდეს მთავარ გვერდზე
          </label>
        </div>
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
