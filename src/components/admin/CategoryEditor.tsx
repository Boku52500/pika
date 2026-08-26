"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { adminCardClass, adminInputErrorClass, adminSelectClass, adminTextareaClass } from "@/components/admin/adminUi";
import { saveAdminCategory } from "@/server/actions/admin";
import type { AdminCategoryEditorData, AdminCategoryRow } from "@/server/admin/categories";

export function CategoryEditor({
  category,
  allCategories,
  isNew,
}: {
  category: AdminCategoryEditorData;
  allCategories: AdminCategoryRow[];
  isNew?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(category);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const descendantIds = new Set<string>();
  if (form.id) {
    const walk = (id: string) => {
      for (const row of allCategories) {
        if (row.parentId === id) {
          descendantIds.add(row.id);
          walk(row.id);
        }
      }
    };
    walk(form.id);
  }
  const parentOptions = allCategories.filter((row) => row.id !== form.id && !descendantIds.has(row.id));

  function submit() {
    setMessage(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveAdminCategory({
        id: form.id || undefined,
        slug: form.slug,
        parentId: form.parentId || null,
        imageUrl: form.imageUrl,
        iconKey: form.iconKey,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
        indexable: form.indexable,
        translations: form.translations,
      });
      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSuccess("კატეგორია შენახულია");
      if (isNew) {
        router.push(`/admin/categories/${result.data.id}?saved=1`);
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
          <FormField id="cat-name" label="დასახელება (ქართული)" required error={fieldErrors["translations.ka.name"]}>
            <input
              id="cat-name"
              value={form.translations.ka.name}
              onChange={(e) => setForm((c) => ({ ...c, translations: { ...c.translations, ka: { ...c.translations.ka, name: e.target.value } } }))}
              className={adminInputErrorClass(Boolean(fieldErrors["translations.ka.name"]))}
            />
          </FormField>
          <FormField id="cat-slug" label="Slug" required error={fieldErrors.slug}>
            <input id="cat-slug" value={form.slug} onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value }))} className={adminInputErrorClass(Boolean(fieldErrors.slug))} />
          </FormField>
          <FormField id="cat-parent" label="მშობელი კატეგორია" optional error={fieldErrors.parentId}>
            <select id="cat-parent" value={form.parentId} onChange={(e) => setForm((c) => ({ ...c, parentId: e.target.value }))} className={adminSelectClass}>
              <option value="">— ზედა დონე</option>
              {parentOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {"— ".repeat(row.depth)}
                  {row.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="cat-sort" label="რიგი">
            <input id="cat-sort" type="number" min={0} value={form.sortOrder} onChange={(e) => setForm((c) => ({ ...c, sortOrder: Number(e.target.value) }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="cat-image" label="სურათის URL" optional className="sm:col-span-2">
            <input id="cat-image" value={form.imageUrl} onChange={(e) => setForm((c) => ({ ...c, imageUrl: e.target.value }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="cat-icon" label="იკონის გასაღები" optional>
            <input id="cat-icon" value={form.iconKey} onChange={(e) => setForm((c) => ({ ...c, iconKey: e.target.value }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="cat-desc" label="აღწერა" optional className="sm:col-span-2">
            <textarea id="cat-desc" value={form.translations.ka.description} onChange={(e) => setForm((c) => ({ ...c, translations: { ...c.translations, ka: { ...c.translations.ka, description: e.target.value } } }))} className={adminTextareaClass} />
          </FormField>
          <FormField id="cat-seo-title" label="SEO სათაური" optional>
            <input id="cat-seo-title" value={form.translations.ka.seoTitle} onChange={(e) => setForm((c) => ({ ...c, translations: { ...c.translations, ka: { ...c.translations.ka, seoTitle: e.target.value } } }))} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="cat-seo-desc" label="SEO აღწერა" optional>
            <input id="cat-seo-desc" value={form.translations.ka.seoDescription} onChange={(e) => setForm((c) => ({ ...c, translations: { ...c.translations, ka: { ...c.translations.ka, seoDescription: e.target.value } } }))} className={adminInputErrorClass(false)} />
          </FormField>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
            აქტიური
          </label>
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input type="checkbox" checked={form.indexable} onChange={(e) => setForm((c) => ({ ...c, indexable: e.target.checked }))} />
            ინდექსირებადი
          </label>
        </div>
      </section>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "ინახება..." : "შენახვა"}
        </Button>
        <Button href="/admin/categories" variant="secondary">
          სიაზე დაბრუნება
        </Button>
      </div>
    </div>
  );
}
