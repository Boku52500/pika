"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdminCategoryMainNav } from "@/server/actions/admin";

export function MainNavToggle({
  id,
  showInMainNav,
}: {
  id: string;
  showInMainNav: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setAdminCategoryMainNav({ id, showInMainNav: !showInMainNav });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={showInMainNav}
      className="text-small min-h-10 rounded-[var(--radius-sm)] border border-border px-3 font-medium hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50"
    >
      {pending ? "..." : showInMainNav ? "ნავიდან მოხსნა" : "მთავარ ნავში"}
    </button>
  );
}
