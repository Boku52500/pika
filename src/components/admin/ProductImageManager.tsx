"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { adminCardClass, adminInputErrorClass } from "@/components/admin/adminUi";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_ACCEPT_LABEL,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_LABEL,
  isPublicImageUrl,
  sniffImageKind,
} from "@/lib/productImageLimits";
import {
  deleteAdminProductImage,
  reorderAdminProductImages,
  updateAdminProductImageAlt,
  uploadAdminProductImage,
} from "@/server/actions/admin";
import { cn } from "@/lib/utils";

export type EditorImage = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  objectKey: string | null;
  key: string;
};

type UploadJob = {
  key: string;
  name: string;
  status: "uploading" | "error";
  message?: string;
};

export function newEditorImage(sortOrder: number): EditorImage {
  return {
    id: "",
    url: "",
    alt: "",
    sortOrder,
    objectKey: null,
    key: `new-${sortOrder}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

export function ProductImageManager({
  productId,
  productName,
  images,
  onChange,
  storageConfigured,
}: {
  productId: string;
  productName: string;
  images: EditorImage[];
  onChange: (images: EditorImage[]) => void;
  storageConfigured: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const busy = pending || jobs.some((job) => job.status === "uploading");

  function persistOrder(next: EditorImage[]) {
    onChange(next);
    const orderedIds = next.map((row) => row.id).filter(Boolean);
    if (!productId || orderedIds.length !== next.length || orderedIds.length === 0) return;
    startTransition(async () => {
      await reorderAdminProductImages({ productId, orderedIds });
    });
  }

  function move(index: number, delta: number) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const copy = [...images];
    const [item] = copy.splice(index, 1);
    copy.splice(nextIndex, 0, item);
    persistOrder(copy);
  }

  async function uploadFiles(fileList: FileList | File[]) {
    setMessage(null);
    if (!productId) {
      setMessage("ჯერ შეინახეთ პროდუქტი, შემდეგ ატვირთეთ სურათები.");
      return;
    }
    if (!storageConfigured) {
      setMessage("სურათების ატვირთვა არ არის კონფიგურირებული. დაამატეთ Cloudflare R2 ცვლადები .env-ში.");
      return;
    }

    const files = Array.from(fileList);
    let nextImages = images;

    for (const file of files) {
      const jobKey = `job-${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
      const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
        setJobs((current) => [
          ...current,
          { key: jobKey, name: file.name, status: "error", message: `ფაილი აღემატება ${PRODUCT_IMAGE_MAX_LABEL}-ს` },
        ]);
        continue;
      }
      if (!sniffImageKind(header)) {
        setJobs((current) => [
          ...current,
          { key: jobKey, name: file.name, status: "error", message: `დასაშვებია ${PRODUCT_IMAGE_ACCEPT_LABEL}` },
        ]);
        continue;
      }

      setJobs((current) => [...current, { key: jobKey, name: file.name, status: "uploading" }]);
      const formData = new FormData();
      formData.set("productId", productId);
      formData.set("file", file);
      formData.set("alt", productName);
      const result = await uploadAdminProductImage(formData);
      if (!result.ok) {
        setJobs((current) =>
          current.map((job) => (job.key === jobKey ? { ...job, status: "error", message: result.message } : job)),
        );
        continue;
      }
      setJobs((current) => current.filter((job) => job.key !== jobKey));
      nextImages = [...nextImages, { ...result.data, key: result.data.id }];
      onChange(nextImages);
    }
  }

  function confirmRemove() {
    if (removeIndex == null) return;
    const target = images[removeIndex];
    const remaining = images.filter((_, i) => i !== removeIndex);
    setRemoveIndex(null);
    if (!target?.id) {
      onChange(remaining);
      return;
    }
    startTransition(async () => {
      const result = await deleteAdminProductImage({ id: target.id });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      onChange(remaining);
    });
  }

  return (
    <section className={adminCardClass}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">სურათები</h2>
          <p className="text-label mt-1 text-text-faint">პირველი სურათი არის ძირითადი კატალოგის ფოტო.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...images, newEditorImage(images.length)])}>
          <Plus className="size-4" />
          URL-ით დამატება
        </Button>
      </div>

      {message ? (
        <p role="alert" className="mb-3 rounded-[var(--radius-sm)] border border-danger-500/25 bg-danger-50 px-3 py-2 text-small text-danger-600">
          {message}
        </p>
      ) : null}

      {!productId ? (
        <p className="text-small mb-4 text-text-muted">ახალი პროდუქტისთვის ჯერ შეინახეთ ჩანაწერი, შემდეგ ატვირთეთ სურათები.</p>
      ) : null}

      {!storageConfigured ? (
        <p role="status" className="text-small mb-4 rounded-[var(--radius-sm)] border border-warning-500/30 bg-warning-50 px-3 py-2 text-text">
          Cloudflare R2 ჯერ არ არის კონფიგურირებული, ამიტომ ატვირთვა გათიშულია. არსებული URL-ები რჩება. იხილეთ docs/storage.md.
        </p>
      ) : null}

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files);
        }}
        className={cn(
          "mb-4 rounded-[var(--radius-sm)] border-2 border-dashed px-4 py-6 text-center",
          dragOver ? "border-brand-500 bg-brand-50" : "border-border",
          (!productId || !storageConfigured) && "opacity-60",
        )}
      >
        <input
          ref={inputRef}
          id="product-image-upload"
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          multiple
          className="sr-only"
          disabled={!productId || !storageConfigured || busy}
          onChange={(event) => {
            if (event.target.files?.length) void uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Upload className="mx-auto mb-2 size-6 text-text-muted" />
        <label htmlFor="product-image-upload" className="text-small font-medium text-brand-700 hover:underline">
          აირჩიეთ სურათები
        </label>
        <p className="text-label mt-1 text-text-faint">ან ჩააგდეთ აქ. {PRODUCT_IMAGE_ACCEPT_LABEL}, მაქსიმუმ {PRODUCT_IMAGE_MAX_LABEL} თითო ფაილზე.</p>
      </div>

      {jobs.length ? (
        <ul className="mb-4 flex flex-col gap-2">
          {jobs.map((job) => (
            <li key={job.key} className="text-small rounded-[var(--radius-sm)] border border-border px-3 py-2">
              <span className="font-medium">{job.name}</span>
              <span className="ml-2 text-text-muted">
                {job.status === "uploading" ? "იტვირთება..." : job.message ?? "ატვირთვა ვერ მოხერხდა"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {images.length === 0 && jobs.length === 0 ? (
        <p className="text-small text-text-muted">სურათები ჯერ არ არის.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {images.map((image, index) => (
            <li key={image.key} className="grid gap-3 rounded-[var(--radius-sm)] border border-border p-3 sm:grid-cols-[88px_1fr_auto]">
              <div className="size-20 overflow-hidden rounded-[var(--radius-sm)] bg-surface-2">
                {isPublicImageUrl(image.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.url} alt={image.alt || productName || ""} className="size-full object-contain" />
                ) : (
                  <div className="flex size-full items-center justify-center px-1 text-center text-[0.65rem] text-text-faint">
                    {index === 0 ? "ძირითადი" : "პრევიუ"}
                  </div>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {image.objectKey ? (
                  <p className="text-label self-end text-success-600">აიტვირთა · R2</p>
                ) : (
                  <FormField id={`img-url-${index}`} label="URL">
                    <input
                      id={`img-url-${index}`}
                      value={image.url}
                      onChange={(event) =>
                        onChange(images.map((row, i) => (i === index ? { ...row, url: event.target.value } : row)))
                      }
                      className={adminInputErrorClass(false)}
                    />
                  </FormField>
                )}
                <FormField id={`img-alt-${index}`} label="Alt ტექსტი" optional>
                  <input
                    id={`img-alt-${index}`}
                    value={image.alt}
                    placeholder={productName || "პროდუქტის სახელი გამოჩნდება თუ ცარიელია"}
                    onChange={(event) =>
                      onChange(images.map((row, i) => (i === index ? { ...row, alt: event.target.value } : row)))
                    }
                    onBlur={() => {
                      if (!image.id) return;
                      startTransition(async () => {
                        await updateAdminProductImageAlt({ id: image.id, alt: image.alt });
                      });
                    }}
                    className={adminInputErrorClass(false)}
                  />
                </FormField>
              </div>
              <div className="flex items-center gap-1 sm:flex-col">
                <button
                  type="button"
                  aria-label="ზემოთ"
                  disabled={index === 0 || busy}
                  className="inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-40"
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="ქვემოთ"
                  disabled={index === images.length - 1 || busy}
                  className="inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-40"
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="წაშლა"
                  disabled={busy}
                  className="inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] border border-border text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  onClick={() => setRemoveIndex(index)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminConfirmDialog
        open={removeIndex != null}
        title="სურათის წაშლა"
        description={
          images[removeIndex ?? -1]?.objectKey
            ? "სურათი წაიშლება კატალოგიდან და Cloudflare R2 საცავიდან. ისტორიული შეკვეთები არ შეიცვლება."
            : "სურათის ჩანაწერი წაიშლება. გარე ჰოსტზე ფაილი არ წაიშლება."
        }
        confirmLabel="წაშლა"
        danger
        pending={busy}
        onClose={() => setRemoveIndex(null)}
        onConfirm={confirmRemove}
      />
    </section>
  );
}
