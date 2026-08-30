"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { adminCardClass, adminInputErrorClass } from "@/components/admin/adminUi";
import {
  deleteAdminHeroSlide,
  reorderAdminHeroSlides,
  saveAdminHeroSlide,
  uploadAdminHeroImage,
} from "@/server/actions/admin";
import type { AdminHeroSlideRow } from "@/server/admin/hero";

export function HeroAdminManager({
  initialSlides,
  storageConfigured,
}: {
  initialSlides: AdminHeroSlideRow[];
  storageConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slides, setSlides] = useState(initialSlides);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminHeroSlideRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setEditing({
      id: "",
      imageUrl: "",
      objectKey: null,
      href: "",
      sortOrder: slides.length,
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
    setMessage(null);
    setSuccess(null);
  }

  function save() {
    if (!editing) return;
    setMessage(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveAdminHeroSlide({
        id: editing.id || undefined,
        imageUrl: editing.imageUrl,
        objectKey: editing.objectKey,
        href: editing.href,
        sortOrder: Number(editing.sortOrder),
        isActive: editing.isActive,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setSuccess("სლაიდი შენახულია");
      setEditing(null);
      router.refresh();
    });
  }

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !editing) return;
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadAdminHeroImage(formData);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setEditing((current) =>
        current
          ? { ...current, imageUrl: result.data.url, objectKey: result.data.objectKey }
          : current,
      );
      setSuccess("სურათი ატვირთულია — შეინახეთ სლაიდი");
    });
  }

  function remove() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteAdminHeroSlide({ id: deleteId });
      setDeleteId(null);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setSlides((current) => current.filter((slide) => slide.id !== deleteId));
      router.refresh();
    });
  }

  function move(id: string, direction: -1 | 1) {
    const index = slides.findIndex((slide) => slide.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= slides.length) return;
    const ordered = [...slides];
    const [item] = ordered.splice(index, 1);
    ordered.splice(next, 0, item!);
    setSlides(ordered);
    startTransition(async () => {
      await reorderAdminHeroSlides({ orderedIds: ordered.map((slide) => slide.id) });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {message ? <p role="alert" className="rounded-[var(--radius-sm)] bg-danger-50 px-3 py-2 text-small text-danger-600">{message}</p> : null}
      {success ? <p role="status" className="rounded-[var(--radius-sm)] bg-success-50 px-3 py-2 text-small text-success-600">{success}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-text-muted">{slides.length} სლაიდი · ულიმიტო რაოდენობა</p>
        <Button type="button" onClick={openNew} disabled={pending}>
          ახალი სლაიდი
        </Button>
      </div>

      {editing ? (
        <section className={adminCardClass}>
          <h2 className="mb-4 text-base font-semibold text-text">{editing.id ? "სლაიდის რედაქტირება" : "ახალი სლაიდი"}</h2>
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="relative aspect-[21/9] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-2 lg:aspect-video">
              {editing.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editing.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-small text-text-faint">სურათი არ არის</div>
              )}
            </div>
            <div className="grid gap-3">
              {storageConfigured ? (
                <FormField id="hero-file" label="სურათის ატვირთვა">
                  <div className="flex flex-wrap gap-2">
                    <input ref={fileRef} id="hero-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={adminInputErrorClass(false)} />
                    <Button type="button" variant="secondary" disabled={pending} onClick={upload}>
                      ატვირთვა
                    </Button>
                  </div>
                </FormField>
              ) : (
                <p className="text-small text-warning-500">სურათის საცავი არ არის კონფიგურირებული — გამოიყენეთ URL.</p>
              )}
              <FormField id="hero-url" label="სურათის URL" required>
                <input
                  id="hero-url"
                  value={editing.imageUrl}
                  onChange={(e) => setEditing((c) => (c ? { ...c, imageUrl: e.target.value } : c))}
                  className={adminInputErrorClass(false)}
                />
              </FormField>
              <FormField id="hero-href" label="გადამისამართება" optional>
                <input
                  id="hero-href"
                  value={editing.href}
                  placeholder="/category/phones ან https://…"
                  onChange={(e) => setEditing((c) => (c ? { ...c, href: e.target.value } : c))}
                  className={adminInputErrorClass(false)}
                />
              </FormField>
              <FormField id="hero-sort" label="რიგი">
                <input
                  id="hero-sort"
                  type="number"
                  min={0}
                  value={editing.sortOrder}
                  onChange={(e) => setEditing((c) => (c ? { ...c, sortOrder: Number(e.target.value) } : c))}
                  className={adminInputErrorClass(false)}
                />
              </FormField>
              <label className="flex min-h-11 items-center gap-2 text-small">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing((c) => (c ? { ...c, isActive: e.target.checked } : c))}
                />
                აქტიური
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={pending || !editing.imageUrl} onClick={save}>
                  {pending ? "ინახება..." : "შენახვა"}
                </Button>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditing(null)}>
                  გაუქმება
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3">
        {slides.map((slide, index) => (
          <article key={slide.id} className={`${adminCardClass} flex flex-col gap-3 sm:flex-row sm:items-center`}>
            <div className="relative h-20 w-full overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface-2 sm:w-40">
              {slide.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.imageUrl} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-small font-medium text-text">
                #{index + 1} · {slide.isActive ? "აქტიური" : "გამორთული"}
              </p>
              <p className="text-label mt-1 truncate text-text-muted">{slide.href || "გადამისამართება არ არის"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={pending || index === 0} onClick={() => move(slide.id, -1)}>
                ზემოთ
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={pending || index === slides.length - 1} onClick={() => move(slide.id, 1)}>
                ქვემოთ
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => setEditing(slide)}>
                რედაქტირება
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setDeleteId(slide.id)}>
                წაშლა
              </Button>
            </div>
          </article>
        ))}
        {slides.length === 0 ? <p className="text-small text-text-muted">სლაიდები ჯერ არ არის. დაამატეთ პირველი ბანერი.</p> : null}
      </div>

      <AdminConfirmDialog
        open={Boolean(deleteId)}
        title="სლაიდის წაშლა"
        description="სლაიდი სამუდამოდ წაიშლება ვიტრინიდან."
        confirmLabel="წაშლა"
        danger
        pending={pending}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
      />
    </div>
  );
}
