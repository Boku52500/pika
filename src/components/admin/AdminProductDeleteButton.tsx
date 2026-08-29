"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveAdminProduct } from "@/server/actions/admin";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

export function AdminProductDeleteButton({
  productId,
  productName,
  className,
  onArchived,
}: {
  productId: string;
  productName: string;
  className?: string;
  onArchived?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await archiveAdminProduct({ id: productId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      onArchived?.();
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        წაშლა
      </button>
      <AdminConfirmDialog
        open={open}
        title="პროდუქტის წაშლა"
        description={`${productName} აღარ გამოჩნდება ვიტრინაზე, ძიებაში, კატეგორიებსა და რეკომენდაციებში. ისტორიული შეკვეთები უცვლელი დარჩება.`}
        confirmLabel="არქივში გადატანა"
        danger
        pending={pending}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
      />
      {error ? <p className="text-label mt-1 text-danger-600">{error}</p> : null}
    </>
  );
}
