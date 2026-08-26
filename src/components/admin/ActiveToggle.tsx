"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdminCategoryActive, setAdminPromotionActive } from "@/server/actions/admin";

export function ActiveToggle({
  id,
  isActive,
  kind,
}: {
  id: string;
  isActive: boolean;
  kind: "category" | "promotion";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (kind === "category") {
        await setAdminCategoryActive({ id, isActive: !isActive });
      } else {
        await setAdminPromotionActive({ id, isActive: !isActive });
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isActive}
      className="text-small min-h-10 rounded-[var(--radius-sm)] border border-border px-3 font-medium hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50"
    >
      {pending ? "..." : isActive ? "გამორთვა" : "ჩართვა"}
    </button>
  );
}
