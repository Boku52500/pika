"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { ProductImageManager, type EditorImage } from "@/components/admin/ProductImageManager";
import { adminCardClass, adminInputErrorClass, adminSelectClass, adminTextareaClass } from "@/components/admin/adminUi";
import { BADGE_KIND_OPTIONS, STOCK_STATE_LABEL } from "@/lib/adminLabels";
import { deactivateAdminProduct, saveAdminProduct } from "@/server/actions/admin";
import type {
  AdminProductEditorData,
  AdminLookupOption,
  AdminSpecGroup,
  AdminVariantAttribute,
} from "@/server/admin/products";

type Props = {
  product: AdminProductEditorData;
  brands: AdminLookupOption[];
  categories: AdminLookupOption[];
  variantAttributes: AdminVariantAttribute[];
  specGroups: AdminSpecGroup[];
  isNew?: boolean;
  storageConfigured?: boolean;
};

function newVariant(): EditorVariant {
  return {
    id: "",
    sku: "",
    priceOverride: "",
    stockQuantity: 0,
    isActive: true,
    optionIds: [],
    key: `var-${Date.now()}`,
  };
}

type EditorVariant = {
  id: string;
  sku: string;
  priceOverride: string;
  stockQuantity: number;
  isActive: boolean;
  optionIds: string[];
  key: string;
};

export function ProductEditor({ product, brands, categories, variantAttributes, specGroups, isNew, storageConfigured = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(product);
  const [images, setImages] = useState<EditorImage[]>(
    () => product.images.map((image, index) => ({ ...image, objectKey: image.objectKey ?? null, key: image.id || `img-${index}` })),
  );
  const [variants, setVariants] = useState<EditorVariant[]>(
    () => product.variants.map((variant, index) => ({ ...variant, key: variant.id || `var-${index}` })),
  );
  const specMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of product.specifications) map[row.specificationId] = row.value;
    return map;
  }, [product.specifications]);
  const [specs, setSpecs] = useState<Record<string, string>>(specMap);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  function patch<K extends keyof AdminProductEditorData>(key: K, value: AdminProductEditorData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function patchKa<K extends keyof AdminProductEditorData["translations"]["ka"]>(
    key: K,
    value: AdminProductEditorData["translations"]["ka"][K],
  ) {
    setForm((current) => ({
      ...current,
      translations: { ...current.translations, ka: { ...current.translations.ka, [key]: value } },
    }));
  }

  function patchLocale(
    locale: "en" | "ru",
    key: keyof AdminProductEditorData["translations"]["ka"],
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: { ...current.translations[locale], [key]: value },
      },
    }));
  }

  function submit() {
    setMessage(null);
    setSuccess(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveAdminProduct({
        id: form.id || undefined,
        sku: form.sku,
        slug: form.slug,
        brandId: form.brandId,
        categoryId: form.categoryId,
        price: form.price,
        previousPrice: form.previousPrice,
        stockQuantity: Number(form.stockQuantity),
        stockStatus: form.stockStatus,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        isNew: form.isNew,
        featuredSort: form.featuredSort,
        newArrivalSort: form.newArrivalSort,
        badgeKind: form.badgeKind || null,
        badgeLabel: form.badgeLabel,
        indexable: form.indexable,
        warrantyMonths: form.warrantyMonths,
        returnDays: form.returnDays,
        translations: form.translations,
        images: images
          .filter((image) => image.url.trim())
          .map((image, index) => ({
            id: image.id || undefined,
            url: image.url,
            alt: image.alt,
            sortOrder: index,
          })),
        variants: variants.map((variant) => ({
          id: variant.id || undefined,
          sku: variant.sku,
          priceOverride: variant.priceOverride,
          stockQuantity: Number(variant.stockQuantity),
          isActive: variant.isActive,
          optionIds: variant.optionIds,
        })),
        specifications: Object.entries(specs).map(([specificationId, value]) => ({ specificationId, value })),
      });
      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSuccess("ცვლილებები შენახულია");
      if (isNew) {
        router.push(`/admin/products/${result.data.id}?saved=1`);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  function deactivate() {
    if (!form.id) return;
    startTransition(async () => {
      const result = await deactivateAdminProduct({ id: form.id });
      setConfirmDeactivate(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setSuccess("პროდუქტი გაითიშა");
      patch("isActive", false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {message ? (
        <p role="alert" className="rounded-[var(--radius-sm)] border border-danger-500/25 bg-danger-50 px-3 py-2 text-small text-danger-600">
          {message}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="rounded-[var(--radius-sm)] border border-success-500/25 bg-success-50 px-3 py-2 text-small text-success-600">
          {success}
        </p>
      ) : null}

      <section className={adminCardClass}>
        <h2 className="mb-4 text-base font-semibold text-text">ძირითადი ინფორმაცია</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="nameKa" label="დასახელება (ქართული)" required error={fieldErrors["translations.ka.name"]}>
            <input
              id="nameKa"
              value={form.translations.ka.name}
              onChange={(e) => patchKa("name", e.target.value)}
              className={adminInputErrorClass(Boolean(fieldErrors["translations.ka.name"]))}
            />
          </FormField>
          <FormField id="slug" label="Slug" required error={fieldErrors.slug}>
            <input id="slug" value={form.slug} onChange={(e) => patch("slug", e.target.value)} className={adminInputErrorClass(Boolean(fieldErrors.slug))} />
          </FormField>
          <FormField id="sku" label="SKU" required error={fieldErrors.sku}>
            <input id="sku" value={form.sku} onChange={(e) => patch("sku", e.target.value)} className={adminInputErrorClass(Boolean(fieldErrors.sku))} />
          </FormField>
          <FormField id="brandId" label="ბრენდი" required error={fieldErrors.brandId}>
            <select id="brandId" value={form.brandId} onChange={(e) => patch("brandId", e.target.value)} className={adminSelectClass}>
              <option value="">აირჩიეთ ბრენდი</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="categoryId" label="კატეგორია" required error={fieldErrors.categoryId}>
            <select id="categoryId" value={form.categoryId} onChange={(e) => patch("categoryId", e.target.value)} className={adminSelectClass}>
              <option value="">აირჩიეთ კატეგორია</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="shortDescription" label="მოკლე აღწერა" className="sm:col-span-2">
            <textarea
              id="shortDescription"
              value={form.translations.ka.shortDescription}
              onChange={(e) => patchKa("shortDescription", e.target.value)}
              className={adminTextareaClass}
            />
          </FormField>
          <FormField id="description" label="სრული აღწერა" className="sm:col-span-2">
            <textarea
              id="description"
              value={form.translations.ka.description}
              onChange={(e) => patchKa("description", e.target.value)}
              className={`${adminTextareaClass} min-h-[8rem]`}
            />
          </FormField>
        </div>
      </section>

      <section className={adminCardClass}>
        <h2 className="mb-4 text-base font-semibold text-text">ფასი და მარაგი</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="price" label="მიმდინარე ფასი" required error={fieldErrors.price}>
            <input id="price" inputMode="decimal" value={form.price} onChange={(e) => patch("price", e.target.value)} className={adminInputErrorClass(Boolean(fieldErrors.price))} />
          </FormField>
          <FormField id="previousPrice" label="წინა ფასი" optional error={fieldErrors.previousPrice}>
            <input id="previousPrice" inputMode="decimal" value={form.previousPrice} onChange={(e) => patch("previousPrice", e.target.value)} className={adminInputErrorClass(Boolean(fieldErrors.previousPrice))} />
          </FormField>
          <FormField id="stockQuantity" label="მარაგი" required error={fieldErrors.stockQuantity}>
            <input
              id="stockQuantity"
              type="number"
              min={0}
              value={form.stockQuantity}
              onChange={(e) => patch("stockQuantity", Number(e.target.value))}
              className={adminInputErrorClass(Boolean(fieldErrors.stockQuantity))}
            />
          </FormField>
          <FormField id="stockStatus" label="ხელმისაწვდომობა">
            <select
              id="stockStatus"
              value={form.stockStatus}
              onChange={(e) => patch("stockStatus", e.target.value as AdminProductEditorData["stockStatus"])}
              className={adminSelectClass}
            >
              {Object.entries(STOCK_STATE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <p className="text-label mt-3 text-text-faint">
          მარაგის სტატუსი: {STOCK_STATE_LABEL[form.stockQuantity <= 0 ? "out-of-stock" : form.stockQuantity <= 3 ? "low-stock" : "in-stock"]}
          {variants.length ? " · ვარიანტების მარაგი ინახება ცალკე" : ""}
        </p>
      </section>

      <section className={adminCardClass}>
        <h2 className="mb-4 text-base font-semibold text-text">ვიტრინა</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input type="checkbox" checked={form.isActive} onChange={(e) => patch("isActive", e.target.checked)} />
            აქტიური
          </label>
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => patch("isFeatured", e.target.checked)} />
            რჩეული
          </label>
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input type="checkbox" checked={form.isNew} onChange={(e) => patch("isNew", e.target.checked)} />
            ახალი შემოსული
          </label>
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input type="checkbox" checked={form.indexable} onChange={(e) => patch("indexable", e.target.checked)} />
            ინდექსირებადი (SEO)
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="featuredSort" label="რჩეულის რიგი" optional>
            <input
              id="featuredSort"
              type="number"
              min={0}
              value={form.featuredSort ?? ""}
              onChange={(e) => patch("featuredSort", e.target.value === "" ? null : Number(e.target.value))}
              className={adminInputErrorClass(false)}
            />
          </FormField>
          <FormField id="newArrivalSort" label="ახალის რიგი" optional>
            <input
              id="newArrivalSort"
              type="number"
              min={0}
              value={form.newArrivalSort ?? ""}
              onChange={(e) => patch("newArrivalSort", e.target.value === "" ? null : Number(e.target.value))}
              className={adminInputErrorClass(false)}
            />
          </FormField>
          <FormField id="badgeKind" label="ბეჯი">
            <select id="badgeKind" value={form.badgeKind} onChange={(e) => patch("badgeKind", e.target.value)} className={adminSelectClass}>
              {BADGE_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="badgeLabel" label="ბეჯის ტექსტი" optional>
            <input id="badgeLabel" value={form.badgeLabel} onChange={(e) => patch("badgeLabel", e.target.value)} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="warranty" label="გარანტია (ტექსტი)" optional>
            <input id="warranty" value={form.translations.ka.warranty} onChange={(e) => patchKa("warranty", e.target.value)} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="warrantyMonths" label="გარანტია (თვე)" optional>
            <input
              id="warrantyMonths"
              type="number"
              min={0}
              value={form.warrantyMonths ?? ""}
              onChange={(e) => patch("warrantyMonths", e.target.value === "" ? null : Number(e.target.value))}
              className={adminInputErrorClass(false)}
            />
          </FormField>
        </div>
      </section>

      <section className={adminCardClass}>
        <h2 className="mb-4 text-base font-semibold text-text">SEO</h2>
        <div className="grid gap-4">
          <FormField id="seoTitle" label="SEO სათაური" optional>
            <input id="seoTitle" value={form.translations.ka.seoTitle} onChange={(e) => patchKa("seoTitle", e.target.value)} className={adminInputErrorClass(false)} />
          </FormField>
          <FormField id="seoDescription" label="SEO აღწერა" optional>
            <textarea id="seoDescription" value={form.translations.ka.seoDescription} onChange={(e) => patchKa("seoDescription", e.target.value)} className={adminTextareaClass} />
          </FormField>
        </div>
      </section>

      <details className={adminCardClass}>
        <summary className="cursor-pointer text-base font-semibold text-text">დამატებითი თარგმანები (EN / RU)</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {(["en", "ru"] as const).map((locale) => (
            <div key={locale} className="flex flex-col gap-3">
              <h3 className="text-small font-semibold uppercase text-text-muted">{locale}</h3>
              <FormField id={`${locale}-name`} label="დასახელება" optional>
                <input
                  id={`${locale}-name`}
                  value={form.translations[locale].name}
                  onChange={(e) => patchLocale(locale, "name", e.target.value)}
                  className={adminInputErrorClass(false)}
                />
              </FormField>
              <FormField id={`${locale}-short`} label="მოკლე აღწერა" optional>
                <textarea
                  id={`${locale}-short`}
                  value={form.translations[locale].shortDescription}
                  onChange={(e) => patchLocale(locale, "shortDescription", e.target.value)}
                  className={adminTextareaClass}
                />
              </FormField>
            </div>
          ))}
        </div>
      </details>

      <ProductImageManager
        productId={form.id}
        productName={form.translations.ka.name}
        images={images}
        onChange={setImages}
        storageConfigured={storageConfigured}
      />

      <section className={adminCardClass}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text">ვარიანტები</h2>
          <Button type="button" variant="secondary" size="sm" onClick={() => setVariants((current) => [...current, newVariant()])}>
            <Plus className="size-4" />
            ვარიანტის დამატება
          </Button>
        </div>
        {variants.length === 0 ? (
          <p className="text-small text-text-muted">ვარიანტები არ არის. პროდუქტის მარაგი გამოიყენება პირდაპირ.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {variants.map((variant, index) => (
              <div key={variant.key} className="rounded-[var(--radius-sm)] border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField id={`v-sku-${index}`} label="SKU">
                    <input
                      id={`v-sku-${index}`}
                      value={variant.sku}
                      onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, sku: e.target.value } : row)))}
                      className={adminInputErrorClass(false)}
                    />
                  </FormField>
                  <FormField id={`v-price-${index}`} label="ფასის override" optional>
                    <input
                      id={`v-price-${index}`}
                      value={variant.priceOverride}
                      onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, priceOverride: e.target.value } : row)))}
                      className={adminInputErrorClass(false)}
                    />
                  </FormField>
                  <FormField id={`v-stock-${index}`} label="მარაგი">
                    <input
                      id={`v-stock-${index}`}
                      type="number"
                      min={0}
                      value={variant.stockQuantity}
                      onChange={(e) =>
                        setVariants((current) => current.map((row, i) => (i === index ? { ...row, stockQuantity: Number(e.target.value) } : row)))
                      }
                      className={adminInputErrorClass(false)}
                    />
                  </FormField>
                  <label className="flex min-h-11 items-end gap-2 pb-2 text-small">
                    <input
                      type="checkbox"
                      checked={variant.isActive}
                      onChange={(e) => setVariants((current) => current.map((row, i) => (i === index ? { ...row, isActive: e.target.checked } : row)))}
                    />
                    აქტიური
                  </label>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {variantAttributes.map((attribute) => (
                    <FormField key={attribute.id} id={`v-${index}-${attribute.slug}`} label={attribute.name}>
                      <select
                        id={`v-${index}-${attribute.slug}`}
                        value={variant.optionIds.find((id) => attribute.options.some((option) => option.id === id)) ?? ""}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setVariants((current) =>
                            current.map((row, i) => {
                              if (i !== index) return row;
                              const without = row.optionIds.filter((id) => !attribute.options.some((option) => option.id === id));
                              return { ...row, optionIds: nextId ? [...without, nextId] : without };
                            }),
                          );
                        }}
                        className={adminSelectClass}
                      >
                        <option value="">—</option>
                        {attribute.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-small mt-3 text-danger-600"
                  onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}
                >
                  ვარიანტის წაშლა
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={adminCardClass}>
        <h2 className="mb-4 text-base font-semibold text-text">სპეციფიკაციები</h2>
        <div className="flex flex-col gap-5">
          {specGroups.map((group) => (
            <div key={group.id}>
              <h3 className="mb-3 text-small font-semibold text-text">{group.name}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.definitions.map((definition) => (
                  <FormField key={definition.id} id={`spec-${definition.id}`} label={definition.unit ? `${definition.name} (${definition.unit})` : definition.name}>
                    <input
                      id={`spec-${definition.id}`}
                      value={specs[definition.id] ?? ""}
                      onChange={(e) => setSpecs((current) => ({ ...current, [definition.id]: e.target.value }))}
                      className={adminInputErrorClass(false)}
                    />
                  </FormField>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-0 sm:rounded-[var(--radius-md)] sm:border sm:px-4">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "ინახება..." : isNew ? "შექმნა" : "შენახვა"}
        </Button>
        {!isNew ? (
          <Button type="button" variant="secondary" disabled={pending || !form.isActive} onClick={() => setConfirmDeactivate(true)}>
            გამორთვა
          </Button>
        ) : null}
        <Button href="/admin/products" variant="ghost">
          სიაზე დაბრუნება
        </Button>
      </div>

      <AdminConfirmDialog
        open={confirmDeactivate}
        title="პროდუქტის გამორთვა"
        description="პროდუქტი აღარ გამოჩნდება ვიტრინაზე. ისტორიული შეკვეთები არ წაიშლება."
        confirmLabel="გამორთვა"
        danger
        pending={pending}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={deactivate}
      />
    </div>
  );
}
